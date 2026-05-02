import 'package:flutter/material.dart';
import 'shimmer_loaders.dart';

/// Widget that displays the integrity/verification status of a grade
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
    if (isVerifying) {
      return _buildVerifyingState();
    }

    if (isVerified) {
      return _buildVerifiedState(context);
    }

    return _buildTamperedState(context);
  }

  Widget _buildVerifyingState() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularShimmer(size: 16),
          SizedBox(width: 8),
          Text(
            'Verifying...',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVerifiedState(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.green.shade50,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.green.shade200),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.verified_user,
            color: Colors.green.shade700,
            size: 18,
          ),
          const SizedBox(width: 6),
          Text(
            'Verified',
            style: TextStyle(
              color: Colors.green.shade700,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTamperedState(BuildContext context) {
    return GestureDetector(
      onTap: onRetry,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.red.shade50,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.red.shade300, width: 1.5),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.report_problem,
              color: Colors.red.shade700,
              size: 18,
            ),
            const SizedBox(width: 6),
            Text(
              'Tamper Detected',
              style: TextStyle(
                color: Colors.red.shade700,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(width: 4),
              Icon(
                Icons.refresh,
                color: Colors.red.shade700,
                size: 14,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Large version of the integrity badge for detail screens
class IntegrityBadgeLarge extends StatelessWidget {
  final bool isVerified;
  final bool isVerifying;
  final String? errorMessage;
  final VoidCallback? onRetry;

  const IntegrityBadgeLarge({
    Key? key,
    required this.isVerified,
    this.isVerifying = false,
    this.errorMessage,
    this.onRetry,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (isVerifying) {
      return _buildVerifyingCard();
    }

    if (isVerified) {
      return _buildVerifiedCard();
    }

    return _buildTamperedCard(context);
  }

  Widget _buildVerifyingCard() {
    return Card(
      color: Colors.blue.shade50,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.blue.shade200, width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            const CircularShimmer(size: 24),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Verifying Integrity',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue.shade900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Checking grade record hash...',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.blue.shade700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerifiedCard() {
    return Card(
      color: Colors.green.shade50,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.green.shade300, width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade100,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.verified_user,
                color: Colors.green.shade700,
                size: 32,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Integrity Verified',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.green.shade900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'This grade record has not been tampered with',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.green.shade700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTamperedCard(BuildContext context) {
    return Card(
      color: Colors.red.shade50,
      elevation: 4,
      shadowColor: Colors.red.shade200,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.red.shade400, width: 2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade100,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.report_problem,
                    color: Colors.red.shade700,
                    size: 32,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '⚠️ TAMPER DETECTED',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.red.shade900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'This grade record may have been modified',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.red.shade700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (errorMessage != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  errorMessage!,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.red.shade900,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ],
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry Verification'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red.shade700,
                    side: BorderSide(color: Colors.red.shade400),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
