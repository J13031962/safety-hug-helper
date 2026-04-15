
ALTER TABLE public.parcels ADD COLUMN account_number text;
ALTER TABLE public.registered_numbers ADD COLUMN user_number text;

UPDATE public.parcels SET account_number = '9999' WHERE LOWER(TRIM(name)) = 'teleguardia';
