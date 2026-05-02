import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/grade_provider.dart';
import '../models/grade_record.dart';
import 'shimmer_loaders.dart';

class EditGradeDialog extends StatefulWidget {
  final GradeRecord gradeRecord;

  const EditGradeDialog({super.key, required this.gradeRecord});

  @override
  State<EditGradeDialog> createState() => _EditGradeDialogState();
}

class _EditGradeDialogState extends State<EditGradeDialog> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _gradeController;
  late String _letterGrade;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _gradeController = TextEditingController(text: widget.gradeRecord.grade.toString());
    _letterGrade = widget.gradeRecord.letterGrade;
  }

  @override
  void dispose() {
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

  Future<void> _updateGrade() async {
    if (_formKey.currentState!.validate()) {
      setState(() => _isLoading = true);
      
      _calculateLetterGrade(_gradeController.text);
      
      final success = await context.read<GradeProvider>().updateGrade(
        gradeId: widget.gradeRecord.id,
        newGrade: double.parse(_gradeController.text),
        newLetterGrade: _letterGrade,
      );

      if (mounted) {
        setState(() => _isLoading = false);
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Grade updated successfully!'), backgroundColor: Colors.green),
          );
          Navigator.of(context).pop(true);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to update grade.'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Icon(Icons.edit, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 10),
          const Text('Edit Grade'),
        ],
      ),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Student ID: ${widget.gradeRecord.studentId}', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Course: ${widget.gradeRecord.courseCode}'),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _gradeController,
                    decoration: const InputDecoration(labelText: 'New Grade (0-100)'),
                    keyboardType: TextInputType.number,
                    onChanged: _calculateLetterGrade,
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
                    Text(
                      _letterGrade,
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: _getLetterGradeColor()),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: _isLoading ? null : () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton.icon(
          onPressed: _isLoading ? null : _updateGrade,
          icon: _isLoading ? const CircularShimmer(size: 20) : const Icon(Icons.save),
          label: const Text('Update Grade'),
        ),
      ],
    );
  }
}