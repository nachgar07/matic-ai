-- Arreglar la relación entre goal_progress y goals agregando foreign key
ALTER TABLE public.goal_progress 
ADD CONSTRAINT goal_progress_goal_id_fkey 
FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE CASCADE;