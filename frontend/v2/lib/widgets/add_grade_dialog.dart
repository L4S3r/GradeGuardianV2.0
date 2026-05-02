import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/grade_provider.dart';
import 'shimmer_loaders.dart';

class AddGradeDialog extends StatefulWidget {
  const AddGradeDialog({super.key});

  @override
  State<AddGradeDialog> createState() => _AddGradeDialogState();
}

class _AddGradeDialogState extends State<AddGradeDialog> {
  final _formKey = GlobalKey<FormState>();
  
  // Controllers for form fields
  final _studentIdController = TextEditingController();
  final _courseNameController = TextEditingController();
  final _courseCodeController = TextEditingController();
  final _gradeController = TextEditingController();
  
  String _letterGrade = 'F';
  bool _isLoading = false;
  bool _isSuccess = false;

  @override
  void dispose() {
    _studentIdController.dispose();
    _courseNameController.dispose();
    _courseCodeController.dispose();
    _gradeController.dispose();
    super.dispose();
  }

  // Logic to determine Letter Grade based on numeric input
  void _calculateLetterGrade(String value) {
    final score = double.tryParse(value) ?? 0;
    String newLetter = 'F';
    
    if (score >= 90) newLetter = 'A';
    else if (score >= 80) newLetter = 'B';
    else if (score >= 70) newLetter = 'C';
    else if (score >= 60) newLetter = 'D';
    
    setState(() {
      _letterGrade = newLetter;
    });
  }

  Color _getLetterGradeColor() {
    switch (_letterGrade) {
      case 'A': return Colors.green;
      case 'B': return Colors.blue;
      case 'C': return Colors.orange;
      case 'D': return Colors.deepOrange;
      default: return Colors.red;
    }
  }

  // The actual submission logic that was missing
Future<void> _saveGrade() async {
  if (_formKey.currentState!.validate()) {
    setState(() => _isLoading = true);
    debugPrint("--- Starting Seal & Save ---");

    try {
      // 1. Double check calculation
      _calculateLetterGrade(_gradeController.text);
      debugPrint("Calculated Letter: $_letterGrade");

      // 2. Call the provider with EXACT parameter names
      final success = await context.read<GradeProvider>().submitGrade(
        studentId: _studentIdController.text.trim(),
        courseName: _courseNameController.text.trim(),
        courseCode: _courseCodeController.text.trim(),
        grade: double.parse(_gradeController.text),
        letterGrade: _letterGrade, // Ensure this variable name matches line 70 of GradeProvider
      );

      debugPrint("Provider result: $success");

      if (success && mounted) {
        setState(() {
          _isLoading = false;
          _isSuccess = true;
        });
        // Wait for animation to play
        await Future.delayed(const Duration(milliseconds: 1500));
        if (mounted) Navigator.of(context).pop(true);
      } else {
        debugPrint("Provider returned false. Check the terminal for backend errors.");
      }
    } catch (e) {
      debugPrint("CRASH in _saveGrade: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}

  @override
  Widget build(BuildContext context) {
    if (_isSuccess) {
      return AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 20),
            TweenAnimationBuilder<double>(
              duration: const Duration(milliseconds: 600),
              tween: Tween(begin: 0.0, end: 1.0),
              curve: Curves.elasticOut,
              builder: (context, value, child) {
                return Transform.scale(scale: value, child: child);
              },
              child: const Icon(Icons.check_circle, color: Colors.green, size: 80),
            ),
            const SizedBox(height: 20),
            const Text('Grade Sealed & Saved', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
          ],
        ),
      );
    }

    return AlertDialog(
      title: Row(
        children: [
          Icon(Icons.security, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 10),
          Text('New Secure Grade'),
        ],
      ),
      content: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _studentIdController,
                decoration: const InputDecoration(labelText: 'Student ID'),
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              TextFormField(
                controller: _courseNameController,
                decoration: const InputDecoration(labelText: 'Course Name'),
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              TextFormField(
                controller: _courseCodeController,
                decoration: const InputDecoration(labelText: 'Course Code'),
                validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                      Expanded(
                        child: TextFormField( // <--- PASTE THE CODE HERE
                          controller: _gradeController,
                          decoration: const InputDecoration(labelText: 'Grade (0-100)'),
                          keyboardType: TextInputType.number,
                          onChanged: (value) => _calculateLetterGrade(value), 
                          validator: (v) {
                            if (v == null || v.isEmpty) return 'Required';
                            if (double.tryParse(v) == null) return 'Enter a valid number';
                            return null;
                  },
                ),
              ),
                  const SizedBox(width: 20),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Letter', style: Theme.of(context).textTheme.labelSmall),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getLetterGradeColor().withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: _getLetterGradeColor().withOpacity(0.5)),
                        ),
                        child: Text(
                          _letterGrade,
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: _getLetterGradeColor(),
                          ),
                        ),
                      ),
                    ],
                  )
                ],
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton.icon(
          onPressed: _isLoading ? null : _saveGrade,
          icon: _isLoading 
            ? const CircularShimmer(size: 20)
            : const Icon(Icons.lock),
          label: const Text('Seal & Save'),
        ),
      ],
    );
  }
}