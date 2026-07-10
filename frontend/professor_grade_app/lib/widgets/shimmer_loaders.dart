import 'dart:async';
import 'package:flutter/material.dart';

/// Animated Cryptographic Radar Pulse & Holographic Loading Engine
class GradeCardShimmer extends StatelessWidget {
  final int count;

  const GradeCardShimmer({Key? key, this.count = 3}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      children: [
        const CyberPulseHeroLoader(),
        const SizedBox(height: 16),
        ...List.generate(count, (_) => const HolographicCardSkeleton()),
      ],
    );
  }
}

/// Alive Hero Radar Loader with cycling security status ticker
class CyberPulseHeroLoader extends StatefulWidget {
  const CyberPulseHeroLoader({Key? key}) : super(key: key);

  @override
  State<CyberPulseHeroLoader> createState() => _CyberPulseHeroLoaderState();
}

class _CyberPulseHeroLoaderState extends State<CyberPulseHeroLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  int _messageIndex = 0;
  late Timer _tickerTimer;

  final List<String> _statusMessages = [
    'Establishing Cryptographic Handshake...',
    'Decrypting HMAC-SHA256 Signatures...',
    'Verifying Academic Grade Integrity...',
    'Synchronizing Student Grade Ledger...',
  ];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();

    _tickerTimer = Timer.periodic(const Duration(milliseconds: 1400), (timer) {
      if (mounted) {
        setState(() {
          _messageIndex = (_messageIndex + 1) % _statusMessages.length;
        });
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _tickerTimer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF0EA5E9).withOpacity(0.3) : const Color(0xFF38BDF8).withOpacity(0.4),
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0EA5E9).withOpacity(0.08),
            blurRadius: 16,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Row(
        children: [
          // Animated Pulsing Radar Icon
          AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return CustomPaint(
                size: const Size(44, 44),
                painter: CyberPulsePainter(
                  progress: _controller.value,
                  color: const Color(0xFF0EA5E9),
                ),
              );
            },
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'SECURING SYSTEM DATA',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                    color: Color(0xFF0EA5E9),
                  ),
                ),
                const SizedBox(height: 4),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: Text(
                    _statusMessages[_messageIndex],
                    key: ValueKey<int>(_messageIndex),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white70 : const Color(0xFF334155),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Holographic Card Skeleton with sweeping glowing laser gradient
class HolographicCardSkeleton extends StatefulWidget {
  const HolographicCardSkeleton({Key? key}) : super(key: key);

  @override
  State<HolographicCardSkeleton> createState() => _HolographicCardSkeletonState();
}

class _HolographicCardSkeletonState extends State<HolographicCardSkeleton>
    with SingleTickerProviderStateMixin {
  late AnimationController _sweepController;

  @override
  void initState() {
    super.initState();
    _sweepController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _sweepController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AnimatedBuilder(
      animation: _sweepController,
      builder: (context, child) {
        return Container(
          margin: const EdgeInsets.symmetric(vertical: 8),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? Colors.white10 : Colors.black12,
            ),
          ),
          child: CustomPaint(
            foregroundPainter: SkeletonLaserSweepPainter(
              progress: _sweepController.value,
              laserColor: isDark
                  ? const Color(0xFF38BDF8).withOpacity(0.12)
                  : const Color(0xFF0EA5E9).withOpacity(0.08),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withOpacity(0.05) : Colors.black.withOpacity(0.04),
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 140,
                            height: 14,
                            decoration: BoxDecoration(
                              color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06),
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            width: 80,
                            height: 10,
                            decoration: BoxDecoration(
                              color: isDark ? Colors.white.withOpacity(0.04) : Colors.black.withOpacity(0.03),
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 70,
                      height: 24,
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      width: 60,
                      height: 24,
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(6),
                      ),
                    ),
                    const Spacer(),
                    Container(
                      width: 100,
                      height: 6,
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withOpacity(0.04) : Colors.black.withOpacity(0.04),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Circular Shimmer Spinner for small widgets & buttons
class CircularShimmer extends StatefulWidget {
  final double size;

  const CircularShimmer({Key? key, this.size = 20}) : super(key: key);

  @override
  State<CircularShimmer> createState() => _CircularShimmerState();
}

class _CircularShimmerState extends State<CircularShimmer>
    with SingleTickerProviderStateMixin {
  late AnimationController _rotationController;

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat();
  }

  @override
  void dispose() {
    _rotationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RotationTransition(
      turns: _rotationController,
      child: SizedBox(
        width: widget.size,
        height: widget.size,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(
            Theme.of(context).primaryColor,
          ),
        ),
      ),
    );
  }
}

/// Custom Painter drawing laser wave across skeleton cards
class SkeletonLaserSweepPainter extends CustomPainter {
  final double progress;
  final Color laserColor;

  SkeletonLaserSweepPainter({required this.progress, required this.laserColor});

  @override
  void paint(Canvas canvas, Size size) {
    final sweepWidth = size.width * 0.4;
    final startX = (size.width + sweepWidth) * progress - sweepWidth;

    final paint = Paint()
      ..shader = LinearGradient(
        colors: [
          Colors.transparent,
          laserColor,
          Colors.transparent,
        ],
      ).createShader(Rect.fromLTWH(startX, 0, sweepWidth, size.height));

    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), paint);
  }

  @override
  bool shouldRepaint(covariant SkeletonLaserSweepPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

/// Custom Painter drawing energetic radar waves
class CyberPulsePainter extends CustomPainter {
  final double progress;
  final Color color;

  CyberPulsePainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxRadius = size.width / 2;

    // Expanding Pulse Waves
    for (int i = 0; i < 2; i++) {
      final waveProgress = (progress + (i * 0.5)) % 1.0;
      final radius = maxRadius * waveProgress;
      final opacity = (1.0 - waveProgress).clamp(0.0, 1.0);

      final pulsePaint = Paint()
        ..color = color.withOpacity(opacity * 0.4)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.0;

      canvas.drawCircle(center, radius, pulsePaint);
    }

    // Core Icon Circle
    final corePaint = Paint()
      ..color = color.withOpacity(0.2)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, 14, corePaint);

    final borderPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;
    canvas.drawCircle(center, 14, borderPaint);

    // Center Dot
    final dotPaint = Paint()..color = color;
    canvas.drawCircle(center, 4, dotPaint);
  }

  @override
  bool shouldRepaint(covariant CyberPulsePainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
