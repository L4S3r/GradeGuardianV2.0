class CourseStat {
  final String code;
  final String name;
  final double average;
  final int students;

  CourseStat({
    required this.code,
    required this.name,
    required this.average,
    required this.students,
  });

  factory CourseStat.fromJson(String code, Map<String, dynamic> json) {
    return CourseStat(
      code: code,
      name: json['name'] ?? '',
      average: (json['average'] as num).toDouble(),
      students: json['students'] as int,
    );
  }
}

class ProfessorStats {
  final int totalGrades;
  final double overallAverage;
  final List<CourseStat> courseStats;
  final Map<String, int> gradeDistribution;

  ProfessorStats({
    required this.totalGrades,
    required this.overallAverage,
    required this.courseStats,
    required this.gradeDistribution,
  });

  factory ProfessorStats.fromJson(Map<String, dynamic> json) {
    var statsMap = json['course_stats'] as Map<String, dynamic>;
    var distMap = json['grade_distribution'] as Map<String, dynamic>? ?? {};
    Map<String, int> dist = {};
    distMap.forEach((k, v) => dist[k] = v as int);

    return ProfessorStats(
      totalGrades: json['total_grades_submitted'] ?? 0,
      overallAverage: (json['overall_average'] as num).toDouble(),
      courseStats: statsMap.entries.map((e) => CourseStat.fromJson(e.key, e.value)).toList(),
      gradeDistribution: dist,
    );
  }
}