import 'package:flutter/foundation.dart';
import '../models/audit_log.dart';
import '../models/grade_record.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';

enum GradeLoadingState { idle, loading, success, error }

class GradeProvider extends ChangeNotifier {
  final ApiService _apiService;
  final NotificationService _notificationService;

  List<GradeRecord> _grades = [];
  List<AuditLog> _currentAuditLogs = [];
  GradeLoadingState _loadingState = GradeLoadingState.idle;
  String? _errorMessage;
  bool _isVerifying = false;

  int _unreadTamperCount = 0;
  int get unreadTamperCount => _unreadTamperCount;
  void clearTamperBadge() {
    _unreadTamperCount = 0;
    notifyListeners();
  }

  GradeProvider(this._apiService, {NotificationService? notificationService})
      : _notificationService = notificationService ?? NotificationService();

  // Getters
  List<GradeRecord> get grades => List.unmodifiable(_grades);
  List<AuditLog> get currentAuditLogs => _currentAuditLogs;
  GradeLoadingState get loadingState => _loadingState;
  String? get errorMessage => _errorMessage;
  bool get isVerifying => _isVerifying;
  bool get hasError => _loadingState == GradeLoadingState.error;
  bool get isLoading => _loadingState == GradeLoadingState.loading;

  List<GradeRecord> get verifiedGrades =>
      _grades.where((g) => g.isVerified).toList();
  List<GradeRecord> get tamperedGrades =>
      _grades.where((g) => !g.isVerified).toList();
  bool get hasTamperedGrades => tamperedGrades.isNotEmpty;

  // Stats
  double get averageGrade {
    final verified = verifiedGrades;
    if (verified.isEmpty) return 0;
    return verified.map((g) => g.grade).reduce((a, b) => a + b) /
        verified.length;
  }

  Map<String, int> get gradeDistribution {
    final map = {'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0};
    for (final g in _grades) {
      final letter = g.letterGrade.isNotEmpty ? g.letterGrade[0] : 'F';
      map.containsKey(letter)
          ? map[letter] = map[letter]! + 1
          : map['F'] = map['F']! + 1;
    }
    return map;
  }

  double get gpa {
    final verified = verifiedGrades;
    if (verified.isEmpty) return 0.0;
    return verified.map((g) => _gradeToGpa(g.grade)).reduce((a, b) => a + b) /
        verified.length;
  }

  double _gradeToGpa(double grade) {
    if (grade >= 90) return 4.0;
    if (grade >= 80) return 3.0;
    if (grade >= 70) return 2.0;
    if (grade >= 60) return 1.0;
    return 0.0;
  }

  // Actions
  Future<void> loadGrades({String? studentId, String? search}) async {
    _loadingState = GradeLoadingState.loading;
    _errorMessage = null;
    notifyListeners();
    try {
      _grades = await _apiService.fetchGrades(studentId: studentId, search: search);
      _loadingState = GradeLoadingState.success;
      await verifyAllGrades();
    } catch (e) {
      _loadingState = GradeLoadingState.error;
      _errorMessage = e.toString();
      _grades = [];
    } finally {
      notifyListeners();
    }
  }

  Future<bool> submitGrade({
    required String studentId,
    required String courseName,
    required String courseCode,
    required double grade,
    required String letterGrade,
  }) async {
    try {
      final newGrade = await _apiService.submitGrade(
        studentId: studentId,
        courseName: courseName,
        courseCode: courseCode,
        grade: grade,
        letterGrade: letterGrade,
      );
      _grades.insert(0, newGrade);
      notifyListeners();
      return true;
    } catch (e, st) {
      debugPrint('submitGrade error: $e\n$st');
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> verifyAllGrades() async {
    if (_grades.isEmpty) return;
    _isVerifying = true;
    notifyListeners();

    final previousTamperedIds = tamperedGrades.map((g) => g.id).toSet();

    try {
      final ids = _grades.map((g) => g.id).toList();
      final results = await _apiService.verifyMultipleGrades(ids);

      // Build a lookup map from grade_id → result for safe matching
      final resultMap = {
        for (final r in results)
          if (r['grade_id'] != null) r['grade_id'].toString(): r,
      };

      _grades = _grades.map((grade) {
        final result = resultMap[grade.id];
        if (result == null) {
          // No result returned for this grade — treat as unverified
          return grade.copyWith(
            isVerified: false,
            verificationError: 'No verification result returned',
          );
        }
        return grade.copyWith(
          isVerified: (result['is_valid'] ?? false) as bool,
          verificationError: result['error'] as String?,
        );
      }).toList();

      final newlyTampered = tamperedGrades
          .where((g) => !previousTamperedIds.contains(g.id))
          .toList();

      if (newlyTampered.isNotEmpty) {
        _unreadTamperCount += newlyTampered.length;
        await _notificationService.showTamperAlert(
          tamperedCount: newlyTampered.length,
          courseNames: newlyTampered.map((g) => g.courseCode).toList(),
        );
      } else if (tamperedGrades.isEmpty && previousTamperedIds.isNotEmpty) {
        await _notificationService.showAllClearNotification();
      }
    } catch (e) {
      debugPrint('verifyAllGrades error: $e');
    } finally {
      _isVerifying = false;
      notifyListeners();
    }
  }

  Future<void> verifySingleGrade(String gradeId) async {
    final index = _grades.indexWhere((g) => g.id == gradeId);
    if (index == -1) return;
    try {
      final results = await Future.wait([
        _apiService.verifyGrade(gradeId),
        _apiService.fetchGradeLogs(gradeId),
      ]);
      final verifyResult = results[0] as Map<String, dynamic>;
      final logs = results[1] as List<AuditLog>;
      _grades[index] = _grades[index].copyWith(
        isVerified: verifyResult['is_valid'] ?? false,
        verificationError: verifyResult['error'] as String?,
      );
      _currentAuditLogs = logs;
    } catch (e) {
      debugPrint('verifySingleGrade error: $e');
      _currentAuditLogs = [];
    } finally {
      notifyListeners();
    }
  }

  Future<bool> repairGrade(String gradeId) async {
    final index = _grades.indexWhere((g) => g.id == gradeId);
    if (index == -1) {
      _errorMessage = 'Grade not found';
      notifyListeners();
      return false;
    }
    try {
      final updatedGrade = await _apiService.repairGrade(gradeId);
      _grades[index] = updatedGrade;
      
      _errorMessage = null;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('repairGrade error: $e');
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> refresh({String? studentId, String? search}) async =>
      loadGrades(studentId: studentId, search: search);

  void clear() {
    _grades = [];
    _loadingState = GradeLoadingState.idle;
    _errorMessage = null;
    _isVerifying = false;
    _unreadTamperCount = 0;
    notifyListeners();
  }
}