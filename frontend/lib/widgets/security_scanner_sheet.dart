import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/grade_record.dart';
import '../providers/grade_provider.dart';
import 'security_shield_animation.dart';

/// Interactive Modal Bottom Sheet for Cryptographic HMAC-SHA256 Grade Verification
class SecurityScannerSheet extends StatefulWidget {
  final GradeRecord grade;

  const SecurityScannerSheet({Key? key, required this.grade}) : super(key: key);

  @override
  State<SecurityScannerSheet> createState() => _SecurityScannerSheetState();
}

class _SecurityScannerSheetState extends State<SecurityScannerSheet>
    with SingleTickerProviderStateMixin {
  late AnimationController _scanController;
  int _currentStep = 0;
  bool _isFinished = false;
  bool _isRepairing = false;
  late Timer _stepTimer;

  final List<String> _steps = [
    'Parsing Normalized String Fields...',
    'Injecting Server-Side Secret Salt...',
    'Executing HMAC-SHA256 Hash Function...',
    'Comparing Signatures against Database Hash...',
  ];

  @override
  void initState() {
    super.initState();
    _scanController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    _stepTimer = Timer.periodic(const Duration(milliseconds: 600), (timer) {
      if (_currentStep < _steps.length - 1) {
        setState(() => _currentStep++);
      } else {
        setState(() => _isFinished = true);
        timer.cancel();
        _scanController.stop();
      }
    });
  }

  @override
  void dispose() {
    _scanController.dispose();
    _stepTimer.cancel();
    super.dispose();
  }

  void _repairGrade() async {
    setState(() => _isRepairing = true);
    final provider = Provider.of<GradeProvider>(context, listen: false);
    final success = await provider.repairGrade(widget.grade.id);
    if (mounted) {
      setState(() => _isRepairing = false);
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success
                ? 'Grade record integrity successfully restored! ✓'
                : 'Failed to repair grade: ${provider.errorMessage ?? "Unknown error"}',
          ),
          backgroundColor: success ? const Color(0xFF10B981) : const Color(0xFFEF4444),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isVerified = widget.grade.isVerified;
    final normalizedString =
        "${widget.grade.id}|${widget.grade.studentId}|${widget.grade.courseCode}|${widget.grade.grade.toStringAsFixed(1)}|${widget.grade.letterGrade}|${widget.grade.recordedAt.toIso8601String().substring(0, 19)}";

    return Material(
      color: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0F172A) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header Handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: isDark ? Colors.white24 : Colors.black12,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),

          // Security Shield Animation
          SecurityShieldAnimation(
            isVerified: isVerified,
            isVerifying: !_isFinished,
            size: 80,
          ),
          const SizedBox(height: 16),

          // Title Status
          Text(
            !_isFinished
                ? 'Cryptographic Verification in Progress'
                : (isVerified ? 'Grade Integrity Verified ✓' : 'SECURITY ALERT: Hash Mismatch ⚠️'),
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: !_isFinished
                  ? const Color(0xFF0EA5E9)
                  : (isVerified ? const Color(0xFF10B981) : const Color(0xFFEF4444)),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),

          // Animated Step Progress List
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? Colors.white10 : Colors.black12,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: List.generate(_steps.length, (index) {
                final isDone = _isFinished || index < _currentStep;
                final isCurrent = !_isFinished && index == _currentStep;

                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Icon(
                        isDone
                            ? Icons.check_circle_rounded
                            : (isCurrent
                                ? Icons.sync_rounded
                                : Icons.radio_button_unchecked_rounded),
                        size: 18,
                        color: isDone
                            ? const Color(0xFF10B981)
                            : (isCurrent
                                ? const Color(0xFF0EA5E9)
                                : Colors.grey.shade400),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _steps[index],
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                            color: isDone
                                ? (isDark ? Colors.white : Colors.black87)
                                : (isCurrent
                                    ? const Color(0xFF0EA5E9)
                                    : Colors.grey),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 16),

          // Monospaced HMAC Hash Container
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF020617) : const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'CANONICAL DATA STRING & HMAC-SHA256 HASH:',
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  normalizedString,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: Color(0xFF38BDF8),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const Divider(color: Colors.white12, height: 16),
                Row(
                  children: [
                    const Icon(Icons.key_rounded, size: 14, color: Color(0xFFF59E0B)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        widget.grade.hash,
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: isVerified ? const Color(0xFF34D399) : const Color(0xFFF87171),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Action Buttons
          if (_isFinished && !isVerified) ...[
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: _isRepairing ? null : _repairGrade,
                icon: _isRepairing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.build_rounded, color: Colors.white),
                label: Text(
                  _isRepairing ? 'Restoring Grade Integrity...' : 'Fix & Repair Tampered Record',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
          ],

          // Close Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: isVerified ? const Color(0xFF10B981) : const Color(0xFF0EA5E9),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text(
                'Close Security Inspector',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}
}
