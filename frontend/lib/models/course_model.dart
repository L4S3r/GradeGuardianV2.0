class CourseModel {
  final String id;
  final String professorId;
  final String courseCode;
  final String courseName;

  CourseModel({
    required this.id,
    required this.professorId,
    required this.courseCode,
    required this.courseName,
  });

  factory CourseModel.fromJson(Map<String, dynamic> json) {
    return CourseModel(
      id: json['id'],
      professorId: json['professor_id'],
      courseCode: json['course_code'],
      courseName: json['course_name'],
    );
  }
  
  String get displayName => '$courseCode - $courseName';
}