import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Animated Grade Radial Gauge & Animated Number Counter Widget
class AnimatedGradeGauge extends StatelessWidget {
  final double grade;
  final String letterGrade;
  final double size;

  const AnimatedGradeGauge({
    Key? key,
    required this.grade,
    required this.letterGrade,
    this.size = 140.0,
  }) : super(key: key);

  Color get _gaugeColor {
    if (grade >= 90) return const Color(0xFF10B981); // A (Emerald)
    if (grade >= 80) return const Color(0xFF0EA5E9); // B (Cyan/Teal)
    if (grade >= 70) return const Color(0xFFF59E0B); // C (Amber)
    if (grade >= 60) return const Color(0xFFF97316); // D (Orange)
    return const Color(0xFFEF4444);                   // F (Red)
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0.0, end: grade),
      duration: const Duration(milliseconds: 1400),
      curve: Curves.easeOutCubic,
      builder: (context, animatedGrade, child) {
        final animatedNormalized = (animatedGrade / 100.0).clamp(0.0, 1.0);

        return Container(
          width: size,
          height: size,
          padding: const EdgeInsets.all(8),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Radial Arc Progress Painter
              CustomPaint(
                size: Size(size, size),
                painter: GradeRadialGaugePainter(
                  progress: animatedNormalized,
                  color: _gaugeColor,
                  backgroundColor: isDark
                      ? Colors.white.withOpacity(0.08)
                      : Colors.black.withOpacity(0.06),
                ),
              ),

              // Animated Grade Counter & Letter Badge
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    animatedGrade.toStringAsFixed(1),
                    style: TextStyle(
                      fontSize: size * 0.22,
                      fontWeight: FontWeight.w800,
                      color: isDark ? Colors.white : const Color(0xFF0F172A),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: _gaugeColor.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _gaugeColor.withOpacity(0.5),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      'Grade $letterGrade',
                      style: TextStyle(
                        fontSize: size * 0.1,
                        fontWeight: FontWeight.w700,
                        color: _gaugeColor,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Custom painter to draw high-definition radial progress gauge
class GradeRadialGaugePainter extends CustomPainter {
  final double progress;
  final Color color;
  final Color backgroundColor;

  GradeRadialGaugePainter({
    required this.progress,
    required this.color,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width / 2) - 8;
    const strokeWidth = 8.0;
    const startAngle = math.pi * 0.75;
    const totalSweep = math.pi * 1.5;

    // Draw Background Track
    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      totalSweep,
      false,
      bgPaint,
    );

    // Draw Active Progress Arc
    final activePaint = Paint()
      ..shader = SweepGradient(
        colors: [color.withOpacity(0.6), color],
        transform: const GradientRotation(startAngle),
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      totalSweep * progress,
      false,
      activePaint,
    );
  }

  @override
  bool shouldRepaint(covariant GradeRadialGaugePainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}
