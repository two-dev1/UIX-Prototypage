-- Correctif à exécuter une fois (déjà intégré à schema.sql pour les prochaines installations).
-- Donne aux utilisateurs connectés le droit de lire leur profil et d'en modifier
-- le nom, le pseudo et l'avatar ; la RLS limite toujours l'accès à leur propre ligne.
revoke all on public.profiles from anon;
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (name, handle, avatar) on public.profiles to authenticated;
