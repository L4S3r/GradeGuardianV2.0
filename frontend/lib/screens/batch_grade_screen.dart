import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/course_model.dart';
import '../providers/grade_provider.dart';
import '../services/api_service.dart';
import '../widgets/shimmer_loaders.dart';
import '../widgets/security_shield_animation.dart';
import '../theme/app_theme.dart';

class GradeEntry {
  final TextEditingController studentIdController = TextEditingController();
  final TextEditingController gradeController = TextEditingController();
  String letterGrade = 'F';

  void dispose() {
    studentIdController.dispose();
    gradeController.dispose();
  }
}

class BatchGradeScreen extends StatefulWidget {
  const BatchGradeScreen({super.key});

  @override
  State<BatchGradeScreen> createState() => _BatchGradeScreenState();
}

class _BatchGradeScreenState extends State<BatchGradeScreen> {
  final _formKey = GlobalKey<FormState>();
  List<CourseModel>? _courses;
  CourseModel? _selectedCourse;
  bool _isSubmitting = false;

  final List<GradeEntry> _entries = [GradeEntry(), GradeEntry(), GradeEntry()];

  @override
  void initState() {
    super.initState();
    _loadCourses();
  }

  Future<void> _loadCourses() async {
    try {
      final courses = await context.read<ApiService>().fetchCourses();
      if (mounted) {
        setState(() {
          _courses = courses;
          if (courses.isNotEmpty) _selectedCourse = courses.first;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _courses = []);
      debugPrint('Failed to load courses: $e');
    }
  }

  @override
  void dispose() {
    for (var entry in _entries) {
      entry.dispose();
    }
    super.dispose();
  }

  void _calculateLetterGrade(GradeEntry entry, String value) {
    final score = double.tryParse(value) ?? 0;
    String newLetter = 'F';
    if (score >= 90) newLetter = 'A';
    else if (score >= 80) newLetter = 'B';
    else if (score >= 70) newLetter = 'C';
    else if (score >= 60) newLetter = 'D';
    
    setState(() {
      entry.letterGrade = newLetter;
    });
  }

  void _addEntryRow() {
    setState(() {
      _entries.add(GradeEntry());
    });
  }

  void _removeEntryRow(int index) {
    if (_entries.length <= 1) return;
    setState(() {
      _entries[index].dispose();
      _entries.removeAt(index);
    });
  }

  Future<void> _submitBatch() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCourse == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a course.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final List<Map<String, dynamic>> payload = [];
    for (var entry in _entries) {
      payload.add({
        'student_id': entry.studentIdController.text.trim(),
        'course_name': _selectedCourse!.courseName,
        'course_code': _selectedCourse!.courseCode,
        'grade': double.parse(entry.gradeController.text.trim()),
        'letter_grade': entry.letterGrade,
      });
    }

    final success = await context.read<GradeProvider>().submitBatchGrades(payload);

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${payload.length} grade records batch-created & HMAC-hashed ✓'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
        Navigator.pop(context);
      } else {
        final err = context.read<GradeProvider>().errorMessage ?? 'Failed to submit batch';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Batch Cryptographic Grade Entry'),
      ),
      body: _courses == null
          ? const Center(child: CircularShimmer(size: 32))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Banner
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE0F2FE),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isDark ? const Color(0xFF334155) : const Color(0xFF7DD3FC),
                        ),
                      ),
                      child: Row(
                        children: [
                          const SecurityShieldAnimation(isVerified: true, size: 44),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text(
                                  'Batch Cryptographic Import',
                                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Each submitted record will generate an immutable HMAC hash.',
                                  style: TextStyle(fontSize: 12, color: Color(0xFF0EA5E9)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Course Selector
                    DropdownButtonFormField<CourseModel>(
                      value: _selectedCourse,
                      decoration: const InputDecoration(
                        labelText: 'Select Target Course',
                        prefixIcon: Icon(Icons.class_outlined),
                      ),
                      items: _courses!.map((c) => DropdownMenuItem(
                        value: c,
                        child: Text(c.displayName),
                      )).toList(),
                      onChanged: (val) => setState(() => _selectedCourse = val),
                    ),
                    const SizedBox(height: 24),

                    // Entry Cards Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Student Records (${_entries.length})',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        TextButton.icon(
                          onPressed: _addEntryRow,
                          icon: const Icon(Icons.add_rounded, size: 18),
                          label: const Text('Add Row'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // List of Student Entry Rows
                    ..._entries.asMap().entries.map((e) {
                      final index = e.key;
                      final entry = e.value;
                      final gradeColor = AppTheme.gradeColor(double.tryParse(entry.gradeController.text) ?? 0);

                      return Container(
                        margin: const EdgeInsets.symmetric(vertical: 6),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xFF1E293B) : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isDark ? Colors.white10 : Colors.black12),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 14,
                              backgroundColor: const Color(0xFF0EA5E9).withOpacity(0.15),
                              child: Text(
                                '${index + 1}',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0EA5E9)),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              flex: 3,
                              child: TextFormField(
                                controller: entry.studentIdController,
                                decoration: const InputDecoration(
                                  labelText: 'Student ID',
                                  isDense: true,
                                ),
                                validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              flex: 2,
                              child: TextFormField(
                                controller: entry.gradeController,
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                decoration: const InputDecoration(
                                  labelText: 'Score',
                                  isDense: true,
                                ),
                                onChanged: (val) => _calculateLetterGrade(entry, val),
                                validator: (v) {
                                  if (v == null || v.trim().isEmpty) return 'Req';
                                  final n = double.tryParse(v);
                                  if (n == null || n < 0 || n > 100) return '0-100';
                                  return null;
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(
                                color: gradeColor.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                entry.letterGrade,
                                style: TextStyle(fontWeight: FontWeight.w800, color: gradeColor),
                              ),
                            ),
                            if (_entries.length > 1)
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, color: Colors.red, size: 20),
                                onPressed: () => _removeEntryRow(index),
                              ),
                          ],
                        ),
                      );
                    }),

                    const SizedBox(height: 24),

                    // Submit Batch Button
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        onPressed: _isSubmitting ? null : _submitBatch,
                        icon: _isSubmitting
                            ? const CircularShimmer(size: 20)
                            : const Icon(Icons.lock_rounded, size: 18),
                        label: Text(_isSubmitting ? 'Hashing & Submitting...' : 'Submit & Secure All Records'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}