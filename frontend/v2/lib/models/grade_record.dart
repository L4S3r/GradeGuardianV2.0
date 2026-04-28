import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

/// Represents a single grade record with integrity verification
class GradeRecord extends Equatable {
  final String id;
  final String studentId;
  final String courseName;
  final String courseCode;
  final double grade;
  final String letterGrade;
  final DateTime recordedAt;
  final String hash;
  final bool isVerified;
  final String? verificationError;

  const GradeRecord({
    required this.id,
    required this.studentId,
    required this.courseName,
    required this.courseCode,
    required this.grade,
    required this.letterGrade,
    required this.recordedAt,
    required this.hash,
    this.isVerified = false,
    this.verificationError,
  });

  /// Factory constructor to create GradeRecord from JSON
  factory GradeRecord.fromJson(Map<String, dynamic> json) {
  try {
    return GradeRecord(
      // Use ?? '' to provide a fallback so the app doesn't crash if a key is missing
      id: json['id'].toString() , 
      studentId: json['student_id'] ?? 'N/A', 
      courseName: json['course_name'] ?? 'N/A',
      courseCode: json['course_code'] ?? 'N/A',
      grade: (json['grade'] as num?)?.toDouble() ?? 0.0,
      letterGrade: json['letter_grade'] ?? 'F',
      recordedAt: json['recorded_at'] != null 
          ? DateTime.parse(json['recorded_at']) 
          : DateTime.now(),      
      hash: json['hash'] ?? '',
      isVerified: json['is_verified'] ?? false, // safe default: unverified until confirmed
    );
  } catch (e) {
    // If it still fails, this will tell you exactly which field is causing the trouble
    debugPrint("Parsing Error in GradeRecord: $e");
    debugPrint("JSON data was: $json");
    rethrow;
  }
}

  /// Convert GradeRecord to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'student_id': studentId,
      'course_name': courseName,
      'course_code': courseCode,
      'grade': grade,
      'letter_grade': letterGrade,
      'recorded_at': recordedAt.toIso8601String(),
      'hash': hash,
      'is_verified': isVerified,
      'verification_error': verificationError,
    };
  }

  /// Create a copy with updated fields
  GradeRecord copyWith({
    String? id,
    String? studentId,
    String? courseName,
    String? courseCode,
    double? grade,
    String? letterGrade,
    DateTime? recordedAt,
    String? hash,
    bool? isVerified,
    String? verificationError,
  }) {
    return GradeRecord(
      id: id ?? this.id,
      studentId: studentId ?? this.studentId,
      courseName: courseName ?? this.courseName,
      courseCode: courseCode ?? this.courseCode,
      grade: grade ?? this.grade,
      letterGrade: letterGrade ?? this.letterGrade,
      recordedAt: recordedAt ?? this.recordedAt,
      hash: hash ?? this.hash,
      isVerified: isVerified ?? this.isVerified,
      verificationError: verificationError ?? this.verificationError,
    );
  }

  /// Generate the data string used for hashing (must match backend)
  String get dataForHashing {
    return '$id|$studentId|$courseCode|$grade|${recordedAt.toIso8601String()}';
  }

  @override
  List<Object?> get props => [
        id,
        studentId,
        courseName,
        courseCode,
        grade,
        letterGrade,
        recordedAt,
        hash,
        isVerified,
        verificationError,
      ];
}