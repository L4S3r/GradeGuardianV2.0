import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/audit_log.dart';
import '../providers/grade_provider.dart';
import 'security_shield_animation.dart';

/// Modal Bottom Sheet displaying audit log timeline with micro-animations
class AuditLogSheet extends StatefulWidget {
  const AuditLogSheet({Key? key}) : super(key: key);

  @override
  State<AuditLogSheet> createState() => _AuditLogSheetState();
}

class _AuditLogSheetState extends State<AuditLogSheet>
    with SingleTickerProviderStateMixin {
  late AnimationController _listAnimationController;

  @override
  void initState() {
    super.initState();
    _listAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..forward();
  }

  @override
  void dispose() {
    _listAnimationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final logs = context.watch<GradeProvider>().currentAuditLogs;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final passCount = logs.where((l) => l.status == 'PASS' || l.status == 'VERIFIED').length;
    final failCount = logs.where((l) => l.status == 'FAIL' || l.status == 'TAMPERED').length;

    return Material(
      color: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.only(top: 16, left: 20, right: 20, bottom: 24),
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0F172A) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Drag Handle
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

            // Header Title & Pulse Shield
            Row(
              children: [
                const SecurityShieldAnimation(
                  isVerified: true,
                  size: 42,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Cryptographic Audit Log',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'HMAC-SHA256 Verification & Repair History',
                        style: TextStyle(fontSize: 12, color: Color(0xFF0EA5E9), fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Summary Metrics Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? Colors.white10 : Colors.black12,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildSummaryPill('Total Audits', '${logs.length}', const Color(0xFF0EA5E9)),
                  _buildSummaryPill('Passed Checks', '$passCount', const Color(0xFF10B981)),
                  _buildSummaryPill('Failures', '$failCount', const Color(0xFFEF4444)),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Divider(height: 1),
            const SizedBox(height: 16),

            // Timeline Log List
            if (logs.isEmpty)
              const Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.history_toggle_off_rounded, size: 48, color: Colors.grey),
                      SizedBox(height: 10),
                      Text(
                        'No verification history found for this record.',
                        style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              )
            else
              Expanded(
                child: ListView.builder(
                  itemCount: logs.length,
                  physics: const BouncingScrollPhysics(),
                  itemBuilder: (context, index) {
                    final log = logs[index];
                    final isLast = index == logs.length - 1;

                    // Staggered Animation
                    final double startInterval = (index / logs.length).clamp(0.0, 0.8);
                    final animation = Tween<double>(begin: 0.0, end: 1.0).animate(
                      CurvedAnimation(
                        parent: _listAnimationController,
                        curve: Interval(startInterval, 1.0, curve: Curves.easeOutCubic),
                      ),
                    );

                    return AnimatedBuilder(
                      animation: animation,
                      builder: (context, child) {
                        return Transform.translate(
                          offset: Offset(0, (1 - animation.value) * 30),
                          child: Opacity(
                            opacity: animation.value,
                            child: _buildTimelineItem(context, log, isLast, isDark),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryPill(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  Widget _buildTimelineItem(BuildContext context, AuditLog log, bool isLast, bool isDark) {
    final isPass = log.status == 'PASS' || log.status == 'VERIFIED';
    final statusColor = isPass ? const Color(0xFF10B981) : const Color(0xFFEF4444);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Timeline Node Indicator Column
          SizedBox(
            width: 36,
            child: Column(
              children: [
                Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.15),
                    shape: BoxShape.circle,
                    border: Border.all(color: statusColor, width: 2),
                  ),
                  child: Icon(
                    isPass ? Icons.check : Icons.close,
                    size: 12,
                    color: statusColor,
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: isDark ? Colors.white12 : Colors.black12,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Log Details Card
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? Colors.white10 : Colors.black12,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        log.action.toUpperCase(),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: statusColor,
                          letterSpacing: 0.5,
                        ),
                      ),
                      Text(
                        _formatTimestamp(log.checkedAt),
                        style: const TextStyle(
                          fontSize: 10,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                  if (log.details != null && log.details!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.black26 : Colors.white,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        log.details!,
                        style: TextStyle(
                          fontSize: 11,
                          color: isDark ? Colors.white70 : Colors.black87,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTimestamp(DateTime dt) {
    final local = dt.toLocal();
    final y = local.year;
    final m = local.month.toString().padLeft(2, '0');
    final d = local.day.toString().padLeft(2, '0');
    final hh = local.hour.toString().padLeft(2, '0');
    final mm = local.minute.toString().padLeft(2, '0');
    final ss = local.second.toString().padLeft(2, '0');
    return '$y-$m-$d $hh:$mm:$ss';
  }
}