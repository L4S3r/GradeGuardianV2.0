import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/grade_provider.dart';
import '../models/grade_record.dart';
import '../widgets/integrity_badge.dart';
import '../widgets/audit_log_sheet.dart';
import '../widgets/security_scanner_sheet.dart';
import '../theme/app_theme.dart';

class GradeCard extends StatelessWidget {
  final GradeRecord grade;
  final VoidCallback? onTap;
  final VoidCallback? onRetryVerification;

  const GradeCard({
    Key? key,
    required this.grade,
    this.onTap,
    this.onRetryVerification,
  }) : super(key: key);

  void _viewLogs(BuildContext context) async {
    await Provider.of<GradeProvider>(context, listen: false)
        .verifySingleGrade(grade.id);
    if (context.mounted) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (_) => const AuditLogSheet(),
      );
    }
  }

  void _inspectSecurity(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SecurityScannerSheet(grade: grade),
    );
  }

  Color get _color => AppTheme.gradeColor(grade.grade);
  Color get _colorLight => AppTheme.gradeColorLight(grade.grade);

  @override
  Widget build(BuildContext context) {
    final isTampered = !grade.isVerified;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        decoration: BoxDecoration(
          color: isTampered ? AppTheme.dangerLight : AppTheme.surface,
          borderRadius: AppTheme.radiusLg,
          border: Border.all(
            color: isTampered ? AppTheme.dangerBorder : AppTheme.cardBorder,
            width: isTampered ? 1.5 : 1,
          ),
          boxShadow: isTampered ? [] : AppTheme.cardShadow,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap ?? () => _inspectSecurity(context),
            borderRadius: AppTheme.radiusLg,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Row 1: Letter badge + course info + integrity badge
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: _colorLight,
                          borderRadius: AppTheme.radiusMd,
                        ),
                        child: Center(
                          child: Text(
                            grade.letterGrade,
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: _color,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              grade.courseName,
                              style: AppTheme.titleMedium.copyWith(
                                color: isTampered
                                    ? AppTheme.textSecondary
                                    : AppTheme.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(grade.courseCode, style: AppTheme.labelSmall),
                            const SizedBox(height: 2),
                            Text('Student ID: ${grade.studentId}', style: AppTheme.labelSmall),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () => _inspectSecurity(context),
                        child: IntegrityBadge(
                          isVerified: grade.isVerified,
                          errorMessage: grade.verificationError,
                          onRetry: onRetryVerification,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 14),

                  // Row 2: Numeric grade + progress bar
                  Row(
                    children: [
                      Text(
                        grade.grade.toStringAsFixed(1),
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: isTampered ? AppTheme.textSecondary : _color,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '/ 100',
                        style: AppTheme.bodyMedium
                            .copyWith(fontSize: 13, color: AppTheme.textHint),
                      ),
                      const Spacer(),
                      SizedBox(
                        width: 100,
                        child: ClipRRect(
                          borderRadius: AppTheme.radiusFull,
                          child: LinearProgressIndicator(
                            value: isTampered ? 0 : grade.grade / 100,
                            minHeight: 6,
                            backgroundColor: AppTheme.cardBorder,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              isTampered ? AppTheme.danger : _color,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),
                  const Divider(height: 1, color: AppTheme.cardBorder),
                  const SizedBox(height: 10),

                  // Row 3: Date & Security Inspector + Audit Log Action
                  Row(
                    children: [
                      GestureDetector(
                        onTap: () => _inspectSecurity(context),
                        child: Row(
                          children: [
                            const Icon(Icons.shield_outlined, size: 14, color: Color(0xFF0EA5E9)),
                            const SizedBox(width: 4),
                            Text(
                              _formatDate(grade.recordedAt),
                              style: AppTheme.labelSmall,
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: () => _viewLogs(context),
                        child: Row(
                          children: [
                            Icon(Icons.history_rounded,
                                size: 14, color: AppTheme.primary),
                            const SizedBox(width: 4),
                            Text(
                              'Audit Log',
                              style: AppTheme.labelSmall
                                  .copyWith(color: AppTheme.primary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  // Clean 1-line Tamper Alert Banner (No heavy button)
                  if (isTampered) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.dangerBorder.withOpacity(0.4),
                        borderRadius: AppTheme.radiusSm,
                      ),
                      child: Row(
                        children: const [
                          Icon(Icons.warning_amber_rounded,
                              size: 14, color: AppTheme.danger),
                          SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Record compromised — tap card to inspect & repair',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.danger,
                                letterSpacing: 0.3,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}