class Professor {
  final String id;
  final String name;
  final String employeeId;
  final String department;
  final String email;

  const Professor({
    required this.id,
    required this.name,
    required this.employeeId,
    required this.department,
    required this.email,
  });

  factory Professor.fromJson(Map<String, dynamic> json) => Professor(
        id:          json['id'] as String,
        name:        json['name'] as String,
        employeeId:  json['employee_id'] as String,
        department:  json['department'] as String,
        email:       json['email'] as String,
      );

  Map<String, dynamic> toJson() => {
        'id':          id,
        'name':        name,
        'employee_id': employeeId,
        'department':  department,
        'email':       email,
      };
}