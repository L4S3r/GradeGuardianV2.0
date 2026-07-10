import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/grade_provider.dart';
import '../services/api_service.dart';
import '../models/course_model.dart';
import 'shimmer_loaders.dart';
import '../theme/app_theme.dart';

class AddGradeDialog extends StatefulWidget {
  const AddGradeDialog({super.key});

  @override
  State<AddGradeDialog> createState() => _AddGradeDialogState();
}

class _AddGradeDialogState extends State<AddGradeDialog> {
  final _formKey = GlobalKey<FormState>();
  
  final _studentIdController = TextEditingController();
  final _gradeController = TextEditingController();
  
  String _letterGrade = 'F';
  bool _isLoading = false;

  List<CourseModel>? _courses;
  CourseModel? _selectedCourse;

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

  Future<void> _showAddCourseDialog() async {
    final codeCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final result = await showDialog<CourseModel>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Add New Course'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: codeCtrl,
              decoration: const InputDecoration(labelText: 'Course Code (e.g. CS101)'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Course Name (e.g. Intro to CS)'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (codeCtrl.text.isEmpty || nameCtrl.text.isEmpty) return;
              try {
                final newCourse = await context.read<ApiService>().createCourse(codeCtrl.text, nameCtrl.text);
                if (ctx.mounted) Navigator.pop(ctx, newCourse);
              } catch (e) {
                if (ctx.mounted) ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Error: $e')));
              }
            },
            child: const Text('Save Course'),
          ),
        ],
      ),
    );
    if (result != null && mounted) {
      setState(() {
        _courses?.add(result);
        _selectedCourse = result;
      });
    }
  }

  @override
  void dispose() {
    _studentIdController.dispose();
    _gradeController.dispose();
    super.dispose();
  }

  void _calculateLetterGrade(String value) {
    final score = double.tryParse(value) ?? 0;
    String newLetter = 'F';
    if (score >= 90) newLetter = 'A';
    else if (score >= 80) newLetter = 'B';
    else if (score >= 70) newLetter = 'C';
    else if (score >= 60) newLetter = 'D';
    
    setState(() => _letterGrade = newLetter);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCourse == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select or add a course first.')),
      );
      return;
    }

    setState(() => _isLoading = true);

    final success = await context.read<GradeProvider>().submitGrade(
      studentId: _studentIdController.text.trim(),
      courseName: _selectedCourse!.courseName,
      courseCode: _selectedCourse!.courseCode,
      grade: double.parse(_gradeController.text.trim()),
      letterGrade: _letterGrade,
    );

    if (mounted) {
      setState(() => _isLoading = false);
      if (success) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Grade record created & secured with HMAC hash ✓'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      } else {
        final err = context.read<GradeProvider>().errorMessage ?? 'Failed to add grade';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(err), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final gradeColor = AppTheme.gradeColor(double.tryParse(_gradeController.text) ?? 0);

    return Material(
      color: Colors.transparent,
      child: Container(
        padding: EdgeInsets.only(
          top: 20,
          left: 24,
          right: 24,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0F172A) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white24 : Colors.black12,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Title Header
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0EA5E9).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.add_task_rounded, color: Color(0xFF0EA5E9)),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Post Student Grade',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Course Selector Row
                if (_courses == null)
                  const CircularShimmer(size: 24)
                else
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<CourseModel>(
                          value: _selectedCourse,
                          decoration: const InputDecoration(
                            labelText: 'Select Course',
                            prefixIcon: Icon(Icons.class_outlined),
                          ),
                          items: _courses!.map((c) => DropdownMenuItem(
                            value: c,
                            child: Text(c.displayName),
                          )).toList(),
                          onChanged: (val) => setState(() => _selectedCourse = val),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline, color: Color(0xFF0EA5E9)),
                        onPressed: _showAddCourseDialog,
                        tooltip: 'Add Course',
                      ),
                    ],
                  ),
                const SizedBox(height: 16),

                // Student ID Input
                TextFormField(
                  controller: _studentIdController,
                  decoration: const InputDecoration(
                    labelText: 'Student ID',
                    hintText: 'e.g., STU-2024-001',
                    prefixIcon: Icon(Icons.badge_outlined),
                  ),
                  validator: (val) => val == null || val.trim().isEmpty ? 'Student ID is required' : null,
                ),
                const SizedBox(height: 16),

                // Numeric Grade Score Input & Live Grade Badge
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _gradeController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'Score (0 - 100)',
                          prefixIcon: Icon(Icons.score_outlined),
                        ),
                        onChanged: _calculateLetterGrade,
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) return 'Score required';
                          final numVal = double.tryParse(val);
                          if (numVal == null || numVal < 0 || numVal > 100) return 'Enter 0-100';
                          return null;
                        },
                      ),
                    ),
                    const SizedBox(width: 16),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      decoration: BoxDecoration(
                        color: gradeColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: gradeColor.withOpacity(0.5)),
                      ),
                      child: Text(
                        'Grade $_letterGrade',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: gradeColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: _isLoading ? null : _submit,
                    icon: _isLoading
                        ? const CircularShimmer(size: 20)
                        : const Icon(Icons.lock_rounded, size: 18),
                    label: Text(_isLoading ? 'Securing Record...' : 'Submit & Secure Grade'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}