import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:fl_chart/fl_chart.dart';
import '../models/stats_model.dart';

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
    return Scaffold(
      appBar: AppBar(title: const Text('Grading Dashboard')),
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
                _buildSummaryHeader(stats),
                const SizedBox(height: 24),
                if (stats.courseStats.isNotEmpty) ...[
                  Text('Overall Grade Distribution', style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 8),
                  Card(
                    elevation: 4,
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
                    child: Padding(
                      padding: const EdgeInsets.only(top: 24, right: 24, left: 8, bottom: 16),
                      child: SizedBox(height: 250, child: _buildCourseAveragesChart(stats)),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
                Text('Your Courses', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                ...stats.courseStats.map((course) => _buildCourseCard(course)).toList(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSummaryHeader(ProfessorStats stats) {
    return Row(
      children: [
        _buildStatCard("Total Grades", stats.totalGrades.toString(), Colors.blue),
        const SizedBox(width: 16),
        _buildStatCard("Overall Avg", stats.overallAverage.toStringAsFixed(2), Colors.green),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Expanded(
      child: Card(
        elevation: 4,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(value, style: TextStyle(fontSize: 24, color: color, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCourseCard(CourseStat course) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: ListTile(
        leading: CircleAvatar(child: Text(course.code.substring(0, 2))),
        title: Text('${course.code}: ${course.name}'),
        subtitle: Text('Students: ${course.students}'),
        trailing: Text(course.average.toStringAsFixed(2), 
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.indigo)),
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
              reservedSize: 40,
              getTitlesWidget: (value, meta) => Text(value.toInt().toString(), style: TextStyle(color: textColor, fontSize: 10)),
            ),
          ),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: 20,
          getDrawingHorizontalLine: (value) => FlLine(color: isDark ? Colors.white12 : Colors.black12, strokeWidth: 1),
        ),
        borderData: FlBorderData(show: false),
        barGroups: stats.courseStats.asMap().entries.map((entry) {
          return BarChartGroupData(
            x: entry.key,
            barRods: [BarChartRodData(toY: entry.value.average, color: Colors.indigoAccent, width: 16, borderRadius: const BorderRadius.vertical(top: Radius.circular(4)))],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildGradeDistributionChart(ProfessorStats stats) {
    final dist = stats.gradeDistribution;
    final total = stats.totalGrades;
    if (total == 0) return const Center(child: Text('No Data'));

    List<PieChartSectionData> sections = [];
    final colors = {
      'A': Colors.green,
      'B': Colors.blue,
      'C': Colors.orange,
      'D': Colors.deepOrange,
      'F': Colors.red,
    };

    dist.forEach((letter, count) {
      if (count > 0) {
        final percentage = (count / total * 100).toStringAsFixed(1);
        sections.add(PieChartSectionData(
          color: colors[letter] ?? Colors.grey,
          value: count.toDouble(),
          title: '$letter\n$percentage%',
          radius: 60,
          titleStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
        ));
      }
    });

    return Row(
      children: [
        Expanded(
          flex: 2,
          child: PieChart(
            PieChartData(
              sectionsSpace: 2,
              centerSpaceRadius: 30,
              sections: sections,
            ),
          ),
        ),
        Expanded(
          flex: 1,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: dist.entries.where((e) => e.value > 0).map((e) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4.0),
                child: Row(
                  children: [
                    Container(width: 12, height: 12, decoration: BoxDecoration(color: colors[e.key], shape: BoxShape.circle)),
                    const SizedBox(width: 8),
                    Text('${e.key}: ${e.value}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}