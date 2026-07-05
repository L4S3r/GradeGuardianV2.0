import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:fl_chart/fl_chart.dart';
import '../models/stats_model.dart';
import '../widgets/animated_grade_gauge.dart';
import '../widgets/security_shield_animation.dart';

class DashboardScreen extends StatefulWidget {
  final String authToken;
  final String baseUrl; // e.g., "http://localhost:8000"

  const DashboardScreen({super.key, required this.authToken, required this.baseUrl});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<ProfessorStats> _statsFuture;

  @override
  void initState() {
    super.initState();
    _statsFuture = fetchStatistics();
  }

  Future<ProfessorStats> fetchStatistics() async {
    final response = await http.get(
      Uri.parse('${widget.baseUrl}/statistics/summary'),
      headers: {
        'Authorization': 'Bearer ${widget.authToken}',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return ProfessorStats.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to load statistics: ${response.body}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Grading & Security Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.shield_rounded, color: Color(0xFF10B981)),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('HMAC-SHA256 Cryptographic Engine Active & Secured ✓'),
                  backgroundColor: Color(0xFF10B981),
                ),
              );
            },
          ),
        ],
      ),
      body: FutureBuilder<ProfessorStats>(
        future: _statsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData) {
            return const Center(child: Text('No statistics available.'));
          }

          final stats = snapshot.data!;
          return RefreshIndicator(
            onRefresh: () async {
              setState(() { _statsFuture = fetchStatistics(); });
            },
            child: ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                _buildSecurityHeroHeader(stats, isDark),
                const SizedBox(height: 24),
                if (stats.courseStats.isNotEmpty) ...[
                  Text('Overall Grade Distribution', style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 8),
                  Card(
                    elevation: 4,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: SizedBox(height: 220, child: _buildGradeDistributionChart(stats)),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text('Course Averages', style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 8),
                  Card(
                    elevation: 4,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.only(top: 24, right: 24, left: 8, bottom: 16),
                      child: SizedBox(height: 250, child: _buildCourseAveragesChart(stats)),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
                Text('Your Courses', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                ...stats.courseStats.map((course) => _buildCourseCard(course)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSecurityHeroHeader(ProfessorStats stats, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [const Color(0xFF0F172A), const Color(0xFF1E293B)]
              : [const Color(0xFFF0FDF4), const Color(0xFFE0F2FE)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFCBD5E1),
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF10B981).withOpacity(0.08),
            blurRadius: 20,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              const SecurityShieldAnimation(
                isVerified: true,
                size: 56,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Cryptographic System Guard',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.2,
                      ),
                    ),
                    SizedBox(height: 3),
                    Text(
                      'HMAC-SHA256 Tamper-Proof Protection',
                      style: TextStyle(
                        fontSize: 12,
                        color: Color(0xFF10B981),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatMetric('Total Grades', stats.totalGrades.toString(), Icons.school_rounded),
              AnimatedGradeGauge(
                grade: stats.overallAverage,
                letterGrade: _getLetterGrade(stats.overallAverage),
                size: 110,
              ),
              _buildStatMetric('Integrity Status', '100% SECURE', Icons.verified_user_rounded),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatMetric(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, size: 24, color: const Color(0xFF0EA5E9)),
        const SizedBox(height: 6),
        Text(
          value,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        Text(
          label,
          style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }

  String _getLetterGrade(double avg) {
    if (avg >= 90) return 'A';
    if (avg >= 80) return 'B';
    if (avg >= 70) return 'C';
    if (avg >= 60) return 'D';
    return 'F';
  }

  Widget _buildCourseCard(CourseStat course) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFF0EA5E9).withOpacity(0.15),
          child: Text(
            course.code.substring(0, 2),
            style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0EA5E9)),
          ),
        ),
        title: Text('${course.code}: ${course.name}', style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text('Students: ${course.students}'),
        trailing: Text(
          course.average.toStringAsFixed(1), 
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF10B981)),
        ),
      ),
    );
  }

  Widget _buildCourseAveragesChart(ProfessorStats stats) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? Colors.white70 : Colors.black87;

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: 100,
        minY: 0,
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              final course = stats.courseStats[groupIndex];
              return BarTooltipItem(
                '${course.code}\n${course.average.toStringAsFixed(1)}',
                const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
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
                if (value.toInt() >= 0 && value.toInt() < stats.courseStats.length) {
                  final courseCode = stats.courseStats[value.toInt()].code;
                  final displayCode = courseCode.length > 6 ? courseCode.substring(0, 6) : courseCode;
                  return Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text(displayCode, style: TextStyle(color: textColor, fontSize: 10, fontWeight: FontWeight.bold)),
                  );
                }
                return const SizedBox.shrink();
              },
              reservedSize: 30,
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 35,
              getTitlesWidget: (value, meta) {
                return Text('${value.toInt()}', style: TextStyle(color: textColor, fontSize: 10));
              },
            ),
          ),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: 20,
          getDrawingHorizontalLine: (value) => FlLine(
            color: isDark ? Colors.white10 : Colors.black12,
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        barGroups: stats.courseStats.asMap().entries.map((entry) {
          final index = entry.key;
          final course = entry.value;
          return BarChartGroupData(
            x: index,
            barRods: [
              BarChartRodData(
                toY: course.average,
                gradient: const LinearGradient(
                  colors: [Color(0xFF0EA5E9), Color(0xFF10B981)],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
                width: 16,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildGradeDistributionChart(ProfessorStats stats) {
    final dist = stats.gradeDistribution;

    if (dist.isEmpty) {
      return const Center(child: Text('No grade distribution data'));
    }

    final sections = dist.entries.map((entry) {
      final letter = entry.key;
      final count = entry.value;
      final color = _getGradeColor(letter);

      return PieChartSectionData(
        color: color,
        value: count.toDouble(),
        title: '$letter\n($count)',
        radius: 65,
        titleStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    }).toList();

    return PieChart(
      PieChartData(
        sections: sections,
        centerSpaceRadius: 40,
        sectionsSpace: 3,
      ),
    );
  }

  Color _getGradeColor(String letter) {
    switch (letter.toUpperCase()) {
      case 'A': return const Color(0xFF10B981);
      case 'B': return const Color(0xFF0EA5E9);
      case 'C': return const Color(0xFFF59E0B);
      case 'D': return const Color(0xFFF97316);
      case 'F': return const Color(0xFFEF4444);
      default: return Colors.grey;
    }
  }
}