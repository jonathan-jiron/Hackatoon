-- Off-topic chats and manipulation attempts are tagged apart so they never count as interest.
alter table conversations drop constraint conversations_sentiment_check;
alter table conversations add constraint conversations_sentiment_check
  check (sentiment in ('interested', 'doubtful', 'frustrated', 'hot_lead', 'spam'));
