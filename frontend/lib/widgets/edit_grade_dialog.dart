import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/grade_provider.dart';
import '../models/grade_record.dart';
import 'shimmer_loaders.dart';
import '../theme/app_theme.dart';

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
    _gradeController = TextEditingController(text: widget.gradeRecord.grade.toStringAsFixed(1));
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
            const SnackBar(
              content: Text('Grade updated & HMAC signature re-signed ✓'),
              backgroundColor: Color(0xFF10B981),
            ),
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
                      child: const Icon(Icons.edit_note_rounded, color: Color(0xFF0EA5E9)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Update Student Grade',
                            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                          ),
                          Text(
                            '${widget.gradeRecord.courseCode} - Student ID: ${widget.gradeRecord.studentId}',
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Numeric Grade Score Input & Live Grade Badge
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _gradeController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(
                          labelText: 'New Score (0 - 100)',
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
                    onPressed: _isLoading ? null : _updateGrade,
                    icon: _isLoading
                        ? const CircularShimmer(size: 20)
                        : const Icon(Icons.security_rounded, size: 18),
                    label: Text(_isLoading ? 'Updating Hash Signature...' : 'Update & Re-Sign Grade'),
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