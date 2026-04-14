-- Remove trigger e function de desenvolvimento que forçava role admin
-- para o usuário lfj182@gmail.com. Não deve existir em produção.

drop trigger if exists trg_enforce_admin_membership_for_lfj182 on public.memberships;
drop function if exists public.enforce_admin_membership_for_lfj182();
