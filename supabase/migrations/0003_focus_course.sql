-- Course the user picked from the menu; gives the AI its context without extra tool calls.
alter table conversations
  add column focus_course_id uuid references courses(id) on delete set null;

grant update (focus_course_id) on conversations to authenticated;
