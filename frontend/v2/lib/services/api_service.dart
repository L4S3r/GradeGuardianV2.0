import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../models/grade_record.dart';
import '../models/audit_log.dart';
import '../models/course_model.dart';

class ApiService {
  final String baseUrl;

  /// JWT token — set this after login so all requests are authenticated.
  String? authToken;

  ApiService({required this.baseUrl});

  // ── Auth headers ─────────────────────────────────────────────────────────
  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
        if (authToken != null) 'Authorization': 'Bearer $authToken',
      };

  // ── Auth ──────────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> register({
    required String name,
    required String employeeId,
    required String department,
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: _headers,
      body: jsonEncode({
        'name':        name,
        'employee_id': employeeId,
        'department':  department,
        'email':       email,
        'password':    password,
      }),
    );
    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    final detail = _extractDetail(response.body);
    throw Exception(detail);
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (response.statusCode == 200) return jsonDecode(response.body);
    final detail = _extractDetail(response.body);
    throw Exception(detail);
  }

  // ── Grades ────────────────────────────────────────────────────────────────
  Future<List<GradeRecord>> fetchGrades({String? studentId, String? search}) async {
    final Map<String, String> queryParameters = {};
    if (studentId != null && studentId.isNotEmpty) {
      queryParameters['student_id'] = studentId;
    }
    if (search != null && search.isNotEmpty) {
      queryParameters['search'] = search;
    }

    final Uri uri = Uri.parse('$baseUrl/grades').replace(
      queryParameters: queryParameters.isNotEmpty ? queryParameters : null,
    );
    final response = await http.get(uri, headers: _headers);
    if (response.statusCode == 200) {
      final List<dynamic> body = jsonDecode(response.body);
      return body.map((item) => GradeRecord.fromJson(item)).toList();
    }
    throw Exception('Failed to load grades: ${response.statusCode}');
  }

  Future<GradeRecord> submitGrade({
    required String studentId,
    required String courseName,
    required String courseCode,
    required double grade,
    required String letterGrade,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/grades'),
      headers: _headers,
      body: jsonEncode({
        'student_id':   studentId,
        'course_name':  courseName,
        'course_code':  courseCode,
        'grade':        grade,
        'letter_grade': letterGrade,
      }),
    );
    if (response.statusCode == 201 || response.statusCode == 200) {
      return GradeRecord.fromJson(jsonDecode(response.body));
    }
    throw Exception('Failed to submit grade: ${response.body}');
  }

  Future<List<GradeRecord>> submitBatchGrades(List<Map<String, dynamic>> grades) async {
    final response = await http.post(
      Uri.parse('$baseUrl/grades/batch'),
      headers: _headers,
      body: jsonEncode({'grades': grades}),
    );
    
    if (response.statusCode == 201 || response.statusCode == 200) {
      final List<dynamic> body = jsonDecode(response.body);
      return body.map((item) => GradeRecord.fromJson(item)).toList();
    }
    
    String errorDetail = 'Unknown error';
    try {
      errorDetail = jsonDecode(response.body)['detail'] ?? response.body;
    } catch (_) {}
    
    throw Exception('Failed to submit batch grades: $errorDetail');
  }

  Future<GradeRecord> updateGrade(String gradeId, double newGrade, String newLetterGrade) async {
    final response = await http.put(
      Uri.parse('$baseUrl/grades/$gradeId'),
      headers: _headers,
      body: jsonEncode({
        'grade': newGrade,
        'letter_grade': newLetterGrade,
      }),
    );
    
    if (response.statusCode == 200) {
      return GradeRecord.fromJson(jsonDecode(response.body));
    }
    throw Exception('Failed to update grade: ${response.body}');
  }

  Future<Map<String, dynamic>> verifyGrade(String gradeId) async {
    final results = await verifyMultipleGrades([gradeId]);
    if (results.isNotEmpty) {
      return {
        'is_valid': results.first['is_valid'] ?? false,
        'error':    results.first['error'],
      };
    }
    return {'is_valid': false, 'error': 'Grade not found'};
  }

  Future<List<AuditLog>> fetchGradeLogs(String gradeId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/grades/$gradeId/logs'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List<dynamic> logsJson = data['logs'] ?? [];
      return logsJson.map((l) => AuditLog.fromJson(l)).toList();
    }
    throw Exception('Failed to load audit logs');
  }

  Future<List<Map<String, dynamic>>> verifyMultipleGrades(List<String> ids) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/verify/batch'),
        headers: _headers,
        body: jsonEncode({'grade_ids': ids}),
      );
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) return List<Map<String, dynamic>>.from(decoded);
        if (decoded is Map && decoded.containsKey('results')) {
          return List<Map<String, dynamic>>.from(decoded['results']);
        }
      }
      return [];
    } catch (e) {
      debugPrint('verifyMultipleGrades error: $e');
      return [];
    }
  }

  Future<List<AuditLog>> fetchAuditLogs() async {
    final response = await http.get(
      Uri.parse('$baseUrl/audit-logs'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      final List<dynamic> logsJson = jsonDecode(response.body);
      return logsJson.map((l) => AuditLog.fromJson(l)).toList();
    }
    throw Exception('Failed to load audit logs');
  }

  Future<GradeRecord> repairGrade(String gradeId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/repair/$gradeId'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      return GradeRecord.fromJson(jsonDecode(response.body));
    }
    throw Exception('Failed to repair grade: ${response.body}');
  }

  // ── Courses ───────────────────────────────────────────────────────────────
  Future<List<CourseModel>> fetchCourses() async {
    final response = await http.get(Uri.parse('$baseUrl/courses'), headers: _headers);
    if (response.statusCode == 200) {
      final List<dynamic> body = jsonDecode(response.body);
      return body.map((item) => CourseModel.fromJson(item)).toList();
    }
    throw Exception('Failed to load courses');
  }

  Future<CourseModel> createCourse(String courseCode, String courseName) async {
    final response = await http.post(
      Uri.parse('$baseUrl/courses'),
      headers: _headers,
      body: jsonEncode({
        'course_code': courseCode,
        'course_name': courseName,
      }),
    );
    if (response.statusCode == 201 || response.statusCode == 200) {
      return CourseModel.fromJson(jsonDecode(response.body));
    }
    throw Exception('Failed to create course: ${response.body}');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  String _extractDetail(String body) {
    try {
      final map = jsonDecode(body);
      return map['detail'] ?? body;
    } catch (_) {
      return body;
    }
  }
}