export const ROLES = {
  STUDENT: "student",
  COCO: "coco",
  ADMIN: "admin",
} as const;

export const STUDENT_STATUS = {
  NOT_JOINED: "not_joined",
  IN_QUEUE: "in_queue",
  IN_INTERVIEW: "in_interview",
  COMPLETED: "completed",
  REJECTED: "rejected",
  ON_HOLD: "on_hold",
  OFFER_GIVEN: "offer_given",
} as const;

export const SOCKET_EVENTS = {
  QUEUE_UPDATED: "queue:updated",
  STATUS_UPDATED: "status:updated",
  NOTIFICATION_SENT: "notification:sent",
  ROUND_UPDATED: "round:updated",
  WALKIN_UPDATED: "walkin:updated",
} as const;
