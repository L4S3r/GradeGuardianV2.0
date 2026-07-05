import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Animated Security Shield widget with rotating cryptographic particles
/// and pulsing aura for grade verification states.
class SecurityShieldAnimation extends StatefulWidget {
  final bool isVerified;
  final bool isVerifying;
  final double size;

  const SecurityShieldAnimation({
    Key? key,
    required this.isVerified,
    this.isVerifying = false,
    this.size = 64.0,
  }) : super(key: key);

  @override
  State<SecurityShieldAnimation> createState() => _SecurityShieldAnimationState();
}

class _SecurityShieldAnimationState extends State<SecurityShieldAnimation>
    with TickerProviderStateMixin {
  late AnimationController _rotationController;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.92, end: 1.08).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Color get _primaryColor {
    if (widget.isVerifying) return const Color(0xFF0EA5E9); // Cyan
    if (widget.isVerified) return const Color(0xFF10B981);  // Emerald
    return const Color(0xFFEF4444);                         // Crimson Red
  }

  Color get _glowColor {
    if (widget.isVerifying) return const Color(0xFF38BDF8).withOpacity(0.3);
    if (widget.isVerified) return const Color(0xFF34D399).withOpacity(0.35);
    return const Color(0xFFF87171).withOpacity(0.35);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_rotationController, _pulseController]),
      builder: (context, child) {
        return Transform.scale(
          scale: widget.isVerifying ? _pulseAnimation.value : 1.0,
          child: Container(
            width: widget.size,
            height: widget.size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: _glowColor,
                  blurRadius: widget.size * 0.35,
                  spreadRadius: widget.size * 0.1,
                ),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Outer Cryptographic Scan Ring
                CustomPaint(
                  size: Size(widget.size, widget.size),
                  painter: ShieldRingPainter(
                    angle: _rotationController.value * 2 * math.pi,
                    color: _primaryColor,
                    isVerifying: widget.isVerifying,
                  ),
                ),

                // Shield Core Icon
                Container(
                  width: widget.size * 0.72,
                  height: widget.size * 0.72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        _primaryColor.withOpacity(0.2),
                        _primaryColor.withOpacity(0.05),
                      ],
                    ),
                    border: Border.all(
                      color: _primaryColor.withOpacity(0.6),
                      width: 1.5,
                    ),
                  ),
                  child: Center(
                    child: Icon(
                      widget.isVerifying
                          ? Icons.shield_outlined
                          : (widget.isVerified
                              ? Icons.verified_user_rounded
                              : Icons.gpp_bad_rounded),
                      size: widget.size * 0.42,
                      color: _primaryColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

/// Custom painter that draws rotating cryptographic particles and radar arc
class ShieldRingPainter extends CustomPainter {
  final double angle;
  final Color color;
  final bool isVerifying;

  ShieldRingPainter({
    required this.angle,
    required this.color,
    required this.isVerifying,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 2;

    final paintArc = Paint()
      ..color = color.withOpacity(0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0
      ..strokeCap = StrokeCap.round;

    // Draw rotating arc
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      angle,
      math.pi * 1.2,
      false,
      paintArc,
    );

    // Draw 4 orbiting cryptographic particle dots
    final particlePaint = Paint()..color = color;
    for (int i = 0; i < 4; i++) {
      final dotAngle = angle + (i * math.pi / 2);
      final dx = center.dx + radius * math.cos(dotAngle);
      final dy = center.dy + radius * math.sin(dotAngle);
      canvas.drawCircle(Offset(dx, dy), 2.5, particlePaint);
    }
  }

  @override
  bool shouldRepaint(covariant ShieldRingPainter oldDelegate) {
    return oldDelegate.angle != angle || oldDelegate.color != color;
  }
}
