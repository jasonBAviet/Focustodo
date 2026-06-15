export function rowToTask(r) {
  return {
    id: r.id,
    title: r.title ?? '',
    projectId: r.project_id ?? null,
    priority: r.priority ?? 'none',
    dueDate: r.due_date ?? null,
    reminder: r.reminder ?? null,
    repeat: r.repeat ?? 'none',
    repeatCustom: r.repeat_custom ?? null,
    note: r.note ?? '',
    subtasks: r.subtasks ?? [],
    pomodoroEstimate: r.pomodoro_estimate ?? 1,
    pomodoroCompleted: r.pomodoro_completed ?? 0,
    totalFocusTime: r.total_focus_time ?? 0,
    completed: r.completed ?? false,
    flagged: r.flagged ?? false,
    tags: r.tags ?? [],
    position: r.position ?? 0,
    createdAt: r.created_at ?? null,
    completedAt: r.completed_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

export function rowToKnowledge(r) {
  return {
    id: r.id,
    title: r.title ?? '',
    projectId: r.project_id ?? null,
    priority: r.priority ?? 'none',
    dueDate: r.due_date ?? null,
    reminder: r.reminder ?? null,
    repeat: r.repeat ?? 'none',
    repeatCustom: r.repeat_custom ?? null,
    note: r.note ?? '',
    subtasks: r.subtasks ?? [],
    pomodoroEstimate: r.pomodoro_estimate ?? 1,
    pomodoroCompleted: r.pomodoro_completed ?? 0,
    totalFocusTime: r.total_focus_time ?? 0,
    completed: r.completed ?? false,
    flagged: r.flagged ?? false,
    tags: r.tags ?? [],
    position: r.position ?? 0,
    createdAt: r.created_at ?? null,
    completedAt: r.completed_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

export function rowToDiary(r) {
  return {
    id: r.id,
    title: r.title ?? '',
    projectId: r.project_id ?? null,
    priority: r.priority ?? 'none',
    dueDate: r.due_date ?? null,
    reminder: r.reminder ?? null,
    repeat: r.repeat ?? 'none',
    repeatCustom: r.repeat_custom ?? null,
    note: r.note ?? '',
    subtasks: r.subtasks ?? [],
    pomodoroEstimate: r.pomodoro_estimate ?? 1,
    pomodoroCompleted: r.pomodoro_completed ?? 0,
    totalFocusTime: r.total_focus_time ?? 0,
    completed: r.completed ?? false,
    flagged: r.flagged ?? false,
    tags: r.tags ?? [],
    position: r.position ?? 0,
    createdAt: r.created_at ?? null,
    completedAt: r.completed_at ?? null,
    updatedAt: r.updated_at ?? null,
    taskId: r.task_id ?? null,
  };
}

export function rowToProject(r) {
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '#7ec8e3',
    isVisible: r.is_visible ?? true,
    taskCount: r.task_count ?? 0,
    folderId: r.folder_id ?? null,
    position: r.position ?? 0,
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

export function rowToFolder(r) {
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '#7ec8e3',
    projectIds: r.project_ids ?? [],
    parentId: r.parent_id ?? null,
    position: r.position ?? 0,
    isVisible: r.is_visible ?? true,
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

export function rowToTag(r) {
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '#7ec8e3',
    projectId: r.project_id ?? null,
    folderId: r.folder_id ?? null,
    isVisible: r.is_visible ?? true,
    createdAt: r.created_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}

export function rowToSettings(r) {
  return {
    pomodoroLength: r.pomodoro_length ?? 25,
    shortBreakLength: r.short_break_length ?? 5,
    longBreakLength: r.long_break_length ?? 15,
    longBreakAfter: r.long_break_after ?? 4,
    autoStartNextPomodoro: r.auto_start_next_pomodoro ?? false,
    autoStartBreak: r.auto_start_break ?? false,
    disableBreak: r.disable_break ?? false,
    alarmSound: r.alarm_sound ?? true,
    darkMode: r.dark_mode ?? 'dark',
    themeWallpaper: r.theme_wallpaper ?? 'dark-forest',
    accentColor: r.accent_color ?? '#f25f5c',
    webhookUrl: r.webhook_url ?? '',
    webhookEnabled: r.webhook_enabled ?? false,
    externalApiUrl: r.external_api_url ?? '',
    externalApiEnabled: r.external_api_enabled ?? false,
    dailyFocusGoalHours: r.daily_focus_goal_hours != null ? Number(r.daily_focus_goal_hours) : 3,
    visibleViews: r.visible_views ?? {},
    calendarScale: r.calendar_scale ?? 'month',
    calendarDateField: r.calendar_date_field ?? 'dueDate',
  };
}

export function rowToSession(r) {
  return {
    id: r.id,
    taskId: r.task_id ?? null,
    taskTitle: r.task_title ?? null,
    type: r.type ?? 'focus',
    duration: r.duration ?? 0,
    startTime: r.start_time ?? null,
    endTime: r.end_time ?? null,
    completed: r.completed ?? true,
  };
}

export function rowToAttachment(r) {
  return {
    id: r.id,
    taskId: r.task_id,
    fileName: r.file_name,
    fileUrl: r.file_url,
    fileSize: r.file_size,
    mimeType: r.mime_type,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function rowToPomodoroRecord(r) {
  return {
    id: r.id,
    taskId: r.task_id ?? null,
    taskTitle: r.task_title ?? null,
    startTime: r.start_time,
    endTime: r.end_time ?? null,
    breakStart: r.break_start ?? null,
    breakEnd: r.break_end ?? null,
    completed: r.completed ?? false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    isDeleted: r.is_deleted ?? false,
  };
}
