import 'package:flutter/material.dart';
import 'security_shield_animation.dart';

/// Animated Security & Integrity Badge for Grade Verification
class IntegrityBadge extends StatelessWidget {
  final bool isVerified;
  final bool isVerifying;
  final String? errorMessage;
  final VoidCallback? onRetry;

  const IntegrityBadge({
    Key? key,
    required this.isVerified,
    this.isVerifying = false,
    this.errorMessage,
    this.onRetry,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (isVerifying) {
      return _buildVerifyingBadge(isDark);
    }

    if (isVerified) {
      return _buildVerifiedBadge(context, isDark);
    }

    return _buildTamperedBadge(context, isDark);
  }

  Widget _buildVerifyingBadge(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0EA5E9).withOpacity(0.15) : const Color(0xFFE0F2FE),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF38BDF8).withOpacity(0.5) : const Color(0xFF7DD3FC),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: const [
          SecurityShieldAnimation(
            isVerified: false,
            isVerifying: true,
            size: 20,
          ),
          SizedBox(width: 8),
          Text(
            'Verifying HMAC...',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF0284C7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVerifiedBadge(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF10B981).withOpacity(0.15) : const Color(0xFFD1FAE5),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF34D399).withOpacity(0.5) : const Color(0xFF6EE7B7),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: const [
          SecurityShieldAnimation(
            isVerified: true,
            isVerifying: false,
            size: 20,
          ),
          SizedBox(width: 6),
          Text(
            'Secured HMAC',
            style: TextStyle(
              color: Color(0xFF059669),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTamperedBadge(BuildContext context, bool isDark) {
    return GestureDetector(
      onTap: onRetry,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFFEF4444).withOpacity(0.15) : const Color(0xFFFEE2E2),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark ? const Color(0xFFF87171).withOpacity(0.5) : const Color(0xFFFCA5A5),
            width: 1.5,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SecurityShieldAnimation(
              isVerified: false,
              isVerifying: false,
              size: 20,
            ),
            const SizedBox(width: 6),
            const Text(
              'TAMPER ALERT',
              style: TextStyle(
                color: Color(0xFFDC2626),
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.3,
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(width: 4),
              const Icon(
                Icons.refresh_rounded,
                size: 14,
                color: Color(0xFFDC2626),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
