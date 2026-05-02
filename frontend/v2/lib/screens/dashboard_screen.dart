import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
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
}