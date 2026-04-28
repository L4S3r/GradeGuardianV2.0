class AuditLog {
  final int? id;
  final String action;
  final String status;
  final DateTime checkedAt;
  final String? details;
  // ADD this getter as an alias:
  String? get errorDetails => details;

  AuditLog({
    this.id,
    required this.action,
    required this.status,
    required this.checkedAt,
    this.details,
  });

  factory AuditLog.fromJson(Map<String, dynamic> json) {
    return AuditLog(
      id: json['id'],
      action: json['action'],
      status: json['status'],
      checkedAt: DateTime.parse(json['checked_at']),
      details: json['details'],
    );
  }
}