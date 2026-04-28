import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../providers/grade_provider.dart';
import '../theme/app_theme.dart';

class StatsScreen extends StatelessWidget {
  const StatsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<GradeProvider>(
      builder: (context, provider, _) {
        if (provider.grades.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.bar_chart_rounded,
                    size: 64, color: AppTheme.textHint),
                SizedBox(height: 16),
                Text('No data to display',
                    style: AppTheme.titleLarge),
                SizedBox(height: 8),
                Text('Add some grades to see your statistics.',
                    style: AppTheme.bodyMedium),
              ],
            ),
          );
        }

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── GPA summary card ───────────────────────────────────
            _GpaSummaryCard(provider: provider),
            const SizedBox(height: 16),

            // ── Distribution bar chart ──────────────────────────────
            _GradeDistributionCard(provider: provider),
            const SizedBox(height: 16),

            // ── Integrity pie ───────────────────────────────────────
            _IntegrityCard(provider: provider),
            const SizedBox(height: 16),

            // ── Best / worst grade ──────────────────────────────────
            _HighlightsCard(provider: provider),

            const SizedBox(height: 24),
          ],
        );
      },
    );
  }
}

// ── GPA Summary ──────────────────────────────────────────────────────────────

class _GpaSummaryCard extends StatelessWidget {
  final GradeProvider provider;
  const _GpaSummaryCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final gpa = provider.gpa;
    final gpaColor = _gpaColor(gpa);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.primary, AppTheme.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: AppTheme.radiusLg,
        boxShadow: AppTheme.elevatedShadow,
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Cumulative GPA',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  gpa.toStringAsFixed(2),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 48,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -1,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _gpaLabel(gpa),
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _MiniStat(
                  label: 'Avg Score',
                  value: provider.averageGrade.toStringAsFixed(1),
                  light: true),
              const SizedBox(height: 8),
              _MiniStat(
                  label: 'Courses',
                  value: provider.grades.length.toString(),
                  light: true),
              const SizedBox(height: 8),
              _MiniStat(
                  label: 'Verified',
                  value: provider.verifiedGrades.length.toString(),
                  light: true),
            ],
          ),
        ],
      ),
    );
  }

  Color _gpaColor(double gpa) {
    if (gpa >= 3.5) return AppTheme.success;
    if (gpa >= 2.5) return AppTheme.primary;
    if (gpa >= 1.5) return AppTheme.warning;
    return AppTheme.danger;
  }

  String _gpaLabel(double gpa) {
    if (gpa >= 3.7) return 'Summa Cum Laude';
    if (gpa >= 3.5) return 'Magna Cum Laude';
    if (gpa >= 3.0) return 'Good Standing';
    if (gpa >= 2.0) return 'Satisfactory';
    if (gpa > 0) return 'Needs Improvement';
    return 'No verified grades';
  }
}

class _MiniStat extends StatelessWidget {
  final String label;
  final String value;
  final bool light;

  const _MiniStat(
      {required this.label, required this.value, this.light = false});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
            color: light ? Colors.white : AppTheme.textPrimary,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: light ? Colors.white60 : AppTheme.textHint,
          ),
        ),
      ],
    );
  }
}

// ── Grade Distribution Bar Chart ─────────────────────────────────────────────

class _GradeDistributionCard extends StatelessWidget {
  final GradeProvider provider;
  const _GradeDistributionCard({required this.provider});

  static const _letters = ['A', 'B', 'C', 'D', 'F'];
  static const _colors = [
    AppTheme.success,
    AppTheme.primary,
    AppTheme.warning,
    Color(0xFFEA580C),
    AppTheme.danger,
  ];

  @override
  Widget build(BuildContext context) {
    final dist = provider.gradeDistribution;
    final maxVal =
        dist.values.isEmpty ? 1 : dist.values.reduce((a, b) => a > b ? a : b);

    return _SectionCard(
      title: 'Grade Distribution',
      icon: Icons.bar_chart_rounded,
      child: SizedBox(
        height: 180,
        child: BarChart(
          BarChartData(
            alignment: BarChartAlignment.spaceAround,
            maxY: (maxVal + 1).toDouble(),
            barTouchData: BarTouchData(
              touchTooltipData: BarTouchTooltipData(
                getTooltipItem: (group, groupIndex, rod, rodIndex) {
                  return BarTooltipItem(
                    '${_letters[groupIndex]}: ${rod.toY.toInt()}',
                    const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 12),
                  );
                },
              ),
            ),
            titlesData: FlTitlesData(
              show: true,
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  getTitlesWidget: (value, meta) {
                    final idx = value.toInt();
                    return Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        _letters[idx],
                        style: AppTheme.labelSmall.copyWith(
                          color: _colors[idx],
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    );
                  },
                  reservedSize: 28,
                ),
              ),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  interval: 1,
                  reservedSize: 24,
                  getTitlesWidget: (value, meta) {
                    if (value == value.floorToDouble()) {
                      return Text(
                        value.toInt().toString(),
                        style: AppTheme.labelSmall,
                      );
                    }
                    return const SizedBox();
                  },
                ),
              ),
              topTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(
                  sideTitles: SideTitles(showTitles: false)),
            ),
            gridData: FlGridData(
              show: true,
              drawVerticalLine: false,
              horizontalInterval: 1,
              getDrawingHorizontalLine: (_) => FlLine(
                color: AppTheme.cardBorder,
                strokeWidth: 1,
              ),
            ),
            borderData: FlBorderData(show: false),
            barGroups: List.generate(_letters.length, (i) {
              final letter = _letters[i];
              final count = dist[letter] ?? 0;
              return BarChartGroupData(
                x: i,
                barRods: [
                  BarChartRodData(
                    toY: count.toDouble(),
                    color: _colors[i],
                    width: 28,
                    borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(6)),
                    backDrawRodData: BackgroundBarChartRodData(
                      show: true,
                      toY: (maxVal + 1).toDouble(),
                      color: _colors[i].withOpacity(0.06),
                    ),
                  ),
                ],
              );
            }),
          ),
        ),
      ),
    );
  }
}

// ── Integrity Pie ────────────────────────────────────────────────────────────

class _IntegrityCard extends StatelessWidget {
  final GradeProvider provider;
  const _IntegrityCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final verified = provider.verifiedGrades.length;
    final tampered = provider.tamperedGrades.length;
    final total = verified + tampered;

    return _SectionCard(
      title: 'Integrity Status',
      icon: Icons.verified_user_rounded,
      child: Row(
        children: [
          SizedBox(
            width: 120,
            height: 120,
            child: total == 0
                ? const Center(child: Text('No data'))
                : PieChart(
                    PieChartData(
                      sectionsSpace: 3,
                      centerSpaceRadius: 32,
                      sections: [
                        PieChartSectionData(
                          value: verified.toDouble(),
                          color: AppTheme.success,
                          title: '',
                          radius: 24,
                        ),
                        if (tampered > 0)
                          PieChartSectionData(
                            value: tampered.toDouble(),
                            color: AppTheme.danger,
                            title: '',
                            radius: 24,
                          ),
                      ],
                    ),
                  ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _PieLegend(
                  color: AppTheme.success,
                  label: 'Verified',
                  count: verified,
                  total: total,
                ),
                const SizedBox(height: 10),
                _PieLegend(
                  color: AppTheme.danger,
                  label: 'Tampered',
                  count: tampered,
                  total: total,
                ),
                const SizedBox(height: 14),
                Text(
                  total == 0
                      ? '—'
                      : '${((verified / total) * 100).toStringAsFixed(0)}% integrity rate',
                  style: AppTheme.titleMedium.copyWith(
                    color: tampered == 0
                        ? AppTheme.success
                        : AppTheme.danger,
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

class _PieLegend extends StatelessWidget {
  final Color color;
  final String label;
  final int count;
  final int total;

  const _PieLegend({
    required this.color,
    required this.label,
    required this.count,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(label, style: AppTheme.bodyMedium),
        ),
        Text(
          '$count',
          style: AppTheme.titleMedium.copyWith(color: color),
        ),
      ],
    );
  }
}

// ── Highlights ───────────────────────────────────────────────────────────────

class _HighlightsCard extends StatelessWidget {
  final GradeProvider provider;
  const _HighlightsCard({required this.provider});

  @override
  Widget build(BuildContext context) {
    final verified = provider.verifiedGrades;
    if (verified.isEmpty) return const SizedBox();

    final best =
        verified.reduce((a, b) => a.grade > b.grade ? a : b);
    final worst =
        verified.reduce((a, b) => a.grade < b.grade ? a : b);

    return _SectionCard(
      title: 'Highlights',
      icon: Icons.emoji_events_rounded,
      child: Row(
        children: [
          Expanded(
            child: _HighlightTile(
              label: 'Best Grade',
              courseCode: best.courseCode,
              courseName: best.courseName,
              grade: best.grade,
              letter: best.letterGrade,
              icon: Icons.trending_up_rounded,
              color: AppTheme.success,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _HighlightTile(
              label: 'Needs Work',
              courseCode: worst.courseCode,
              courseName: worst.courseName,
              grade: worst.grade,
              letter: worst.letterGrade,
              icon: Icons.trending_down_rounded,
              color: AppTheme.danger,
            ),
          ),
        ],
      ),
    );
  }
}

class _HighlightTile extends StatelessWidget {
  final String label;
  final String courseCode;
  final String courseName;
  final double grade;
  final String letter;
  final IconData icon;
  final Color color;

  const _HighlightTile({
    required this.label,
    required this.courseCode,
    required this.courseName,
    required this.grade,
    required this.letter,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.06),
        borderRadius: AppTheme.radiusMd,
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Text(label,
                  style: AppTheme.labelSmall.copyWith(color: color)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            letter,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
          Text(
            grade.toStringAsFixed(1),
            style: AppTheme.bodyMedium.copyWith(
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            courseName,
            style: AppTheme.labelSmall,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            courseCode,
            style: AppTheme.labelSmall.copyWith(
              color: AppTheme.textHint,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Shared section card wrapper ───────────────────────────────────────────────

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;

  const _SectionCard({
    required this.title,
    required this.icon,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: AppTheme.radiusLg,
        border: Border.all(color: AppTheme.cardBorder),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: AppTheme.primary),
              const SizedBox(width: 8),
              Text(title, style: AppTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}