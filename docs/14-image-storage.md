# TurtWatch — Image Storage

Turtle photos can live in one of three places, chosen by `VITE_IMAGE_STORAGE`.
The app code only ever sees a URL; the upload is handled by an `ImageStorage`
adapter (`src/lib/storage/`).

| Mode | Where photos go | Setup |
|---|---|---|
| `local` (default) | Downscaled base64 JPEG inside app state / localStorage | none |
| `supabase` | Supabase Storage `turtles` bucket | bucket + policies (below) |
| `firebase` | Firebase Storage `turtles/` path | Firebase project + rules |

Flow: a picked photo is downscaled to a base64 JPEG (`fileToStorableDataUrl`).
In `local` mode it's stored inline. In cloud mode, `persistPhoto()` converts it
to a Blob and uploads via the adapter, storing only the returned URL in the DB.

## Supabase Storage
Bucket + RLS policies are in [`supabase/README.md`](../supabase/README.md):
```sql
insert into storage.buckets (id, name, public) values ('turtles','turtles', true)
  on conflict (id) do nothing;
create policy "own turtle uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'turtles' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "public turtle reads" on storage.objects for select using (bucket_id = 'turtles');
```
`.env`: `VITE_IMAGE_STORAGE=supabase` (plus the `VITE_SUPABASE_*` backend vars).

## Firebase Storage
1. Create a Firebase project → enable **Storage**.
2. Copy the web config into `.env` (`VITE_FIREBASE_*`) and set
   `VITE_IMAGE_STORAGE=firebase`.
3. Security rules — users may only write their own folder:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /turtles/{userId}/{file} {
      allow read: if true;                       // public read of turtle pics
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Firebase is a **lazy dynamic import** (`src/lib/storage/firebaseStorage.ts`), so it
is only loaded when `VITE_IMAGE_STORAGE=firebase` — the default build doesn't ship it.

## Adding another provider (e.g. S3/R2)
Implement the `ImageStorage` interface (`upload(key, blob) → url`) and wire it into
`getImageStorage()` in `src/lib/storage/index.ts`. Nothing else changes.
