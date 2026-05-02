import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/course_model.dart';
import '../providers/grade_provider.dart';
import '../services/api_service.dart';
import '../widgets/shimmer_loaders.dart';

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

  // Start with 3 empty rows
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
    if (_entries.length > 1) {
      setState(() {
        _entries[index].dispose();
        _entries.removeAt(index);
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('You must have at least one entry row.')),
      );
    }
  }

  Future<void> _submitBatch() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCourse == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a course first.')));
      return;
    }

    setState(() => _isSubmitting = true);

    // Prepare data
    List<Map<String, dynamic>> batchData = _entries.map((entry) {
      return {
        'student_id': entry.studentIdController.text.trim(),
        'course_name': _selectedCourse!.courseName,
        'course_code': _selectedCourse!.courseCode,
        'grade': double.parse(entry.gradeController.text),
        'letter_grade': entry.letterGrade,
      };
    }).toList();

    final success = await context.read<GradeProvider>().submitBatchGrades(batchData);

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Batch grades sealed and saved!'), backgroundColor: Colors.green));
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to submit batch grades.'), backgroundColor: Colors.red));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Batch Grade Entry'),
        actions: [
          if (_isSubmitting)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: CircularShimmer(size: 24),
            )
          else
            IconButton(
              icon: const Icon(Icons.check_circle),
              tooltip: 'Submit Batch',
              onPressed: _submitBatch,
            ),
        ],
      ),
      body: Column(
        children: [
          // Top Panel: Course Selection
          Container(
            padding: const EdgeInsets.all(16.0),
            color: Theme.of(context).colorScheme.surfaceVariant,
            child: _courses == null
                ? const Center(child: CircularProgressIndicator())
                : DropdownButtonFormField<CourseModel>(
                    value: _selectedCourse,
                    decoration: const InputDecoration(
                      labelText: 'Select Course for Batch Entry',
                      filled: true,
                    ),
                    items: _courses!.map((c) => DropdownMenuItem(
                          value: c,
                          child: Text(c.displayName),
                        )).toList(),
                    onChanged: (val) => setState(() => _selectedCourse = val),
                  ),
          ),
          // Scrollable List of Grade Inputs
          Expanded(
            child: Form(
              key: _formKey,
              child: ListView.builder(
                padding: const EdgeInsets.all(8.0),
                itemCount: _entries.length,
                itemBuilder: (context, index) {
                  final entry = _entries[index];
                  return Card(
                    margin: const EdgeInsets.symmetric(vertical: 6.0, horizontal: 8.0),
                    elevation: 2,
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Student ID
                          Expanded(
                            flex: 2,
                            child: TextFormField(
                              controller: entry.studentIdController,
                              decoration: InputDecoration(labelText: 'Student ID #${index + 1}'),
                              validator: (v) => v!.isEmpty ? 'Required' : null,
                            ),
                          ),
                          const SizedBox(width: 16),
                          // Grade
                          Expanded(
                            flex: 1,
                            child: TextFormField(
                              controller: entry.gradeController,
                              decoration: const InputDecoration(labelText: 'Grade'),
                              keyboardType: TextInputType.number,
                              onChanged: (val) => _calculateLetterGrade(entry, val),
                              validator: (v) {
                                if (v == null || v.isEmpty) return 'Req';
                                if (double.tryParse(v) == null) return 'Num';
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          // Letter Grade Display & Delete Button
                          Column(
                            children: [
                              Text(entry.letterGrade, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                              IconButton(
                                icon: const Icon(Icons.delete, color: Colors.red),
                                onPressed: () => _removeEntryRow(index),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _addEntryRow,
        icon: const Icon(Icons.add),
        label: const Text('Add Row'),
      ),
    );
  }
}