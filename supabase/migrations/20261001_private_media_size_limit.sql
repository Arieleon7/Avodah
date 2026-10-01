-- Increase pre-existing private AVODAH bucket object size to 50 MiB.
update storage.buckets set file_size_limit=52428800 where id='avodah-files' and (file_size_limit is null or file_size_limit<52428800);
