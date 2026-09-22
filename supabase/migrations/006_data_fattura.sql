-- 006 — Data del documento (fattura o nota di credito per i rimborsi)
alter table public.spese add column data_fattura date;

-- Per le spese già registrate si usa la data di pagamento, se presente
update public.spese set data_fattura = data where data_fattura is null and data is not null;
