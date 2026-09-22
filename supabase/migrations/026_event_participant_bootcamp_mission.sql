-- Bootcamp mission fields on event_participant (temporary Creators Bootcamp flow).
-- Used by /creator-bootcamp-mission for survey answers and submitted post links.

alter table public.event_participant
  add column if not exists survey_answers jsonb,
  add column if not exists survey_submitted_at timestamptz,
  add column if not exists mission_post_links text[] not null default '{}';

comment on column public.event_participant.survey_answers is
  'Bootcamp mission survey answers as { q1: "...", q2: "..." }.';
comment on column public.event_participant.survey_submitted_at is
  'When the bootcamp mission survey was submitted.';
comment on column public.event_participant.mission_post_links is
  'Bootcamp mission post URLs (FB/TikTok/IG) submitted by the creator.';
