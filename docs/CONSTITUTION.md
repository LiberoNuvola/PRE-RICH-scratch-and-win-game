1. Filosofia del protocollo

PRE-RICH deve essere:



100% on-chain

100% automatico

trustless

pubblico e verificabile

open source

senza team, dev, founder o amministratore beneficiario

senza pagamenti discrezionali a persone

modificabile tramite governance PRE, ma senza possibilità di stravolgere la costituzione del protocollo

La governance può modificare parametri economici/operativi entro limiti definiti, ma non può trasformare il protocollo in qualcosa di diverso dalla sua filosofia.



2. Treasury

Tutte le entrate arrivano direttamente al Treasury on-chain.



Nessun passaggio:



utente → team → treasury



ma:



utente

  ↓

Treasury

  ↓

┌──────────────┬──────────────┬──────────────┐

Prize          Stake          Maintenance    Reserve



Le percentuali sono determinate dalla configurazione/governance prevista.



Non esiste una quota "team/dev".



La maintenance è una categoria del protocollo, non un wallet personale.



3. Ticket

Il ticket è un NFT/unique native asset.



L'NFT:



nasce al purchase;

ha un'identità unica;

è trasferibile;

non viene automaticamente bruciato;

può essere conservato dopo il claim;

può diventare un oggetto da collezione;

può essere eventualmente bruciato volontariamente dal proprietario.

Il ticket deve essere progettato fin dall'inizio per supportare il secondary market.



4. Prezzo

Prezzo canonico:



2 USDM



Il frontend mostra sempre il prezzo in USDM.



Il pagamento può essere effettuato con:



USDM;

ADA;

PRE;

combinazione dei tre,

usando il feed Charlie3 per determinare l'equivalente.



La conversione deve essere verificata on-chain.



5. Ticket non rivelato

Prima del reveal il ticket contiene solo le informazioni necessarie:



ticketId

commitment

round

configuration reference

issuedAt

expiresAt

owner



Non deve contenere né permettere di dedurre:



symbol

tier

payout

jackpot



Il risultato deve essere crittograficamente nascosto.



Questo vale anche considerando tutti i dati pubblici della blockchain, non soltanto il datum.



6. Beacon / randomness

Il sistema deve usare un vero schema:



COMMIT

   ↓

LOCK

   ↓

REVEAL

   ↓

RANDOMNESS



Il relayer non deve essere un'autorità sulla fairness.



Il commitment deve essere vincolato a:



game

round

configuration

protocol version



e il reveal deve essere verificabile on-chain.



La randomness deve avere:



commitment forte;

reveal verificabile;

domain separation;

nessun modulo bias;

rejection sampling dove necessario;

impossibilità di grinding;

impossibilità di scegliere il risultato dopo aver visto il ticket;

fallback/timeout permissionless.

7. Randomness del ticket

Il risultato nasce dalla combinazione del commitment del ticket e del beacon.



Concettualmente:



GameRoundCommitment

        +

Beacon secret

        +

Ticket commitment/secret

        ↓

Master Random

        ↓

Symbol derivations



Le derivazioni devono essere domain-separated.



I cinque simboli normali rimangono quelli esistenti:



1  2  3  4  5



Non li cambiamo.



8. Jackpot

Il jackpot ha un simbolo separato.



Non altera la distribuzione dei cinque simboli normali.



La sua attivazione è automatica:



effectivePool >= jackpotThreshold

        ↓

jackpot active



La scelta del ticket jackpot viene dalla randomness, non da un amministratore.



Nessun backend può "attivare" o "assegnare" il jackpot.



9. Premi

I premi sono proporzionali alla liquidità disponibile.



Ma il concetto corretto è:



effectivePool



non semplicemente il valore grezzo dell'UTxO.



Dobbiamo tenere conto delle liability già esistenti.



Schema:



TOTAL POOL

   │

   ├── pending winning liabilities

   ├── unresolved-ticket reserve

   │

   └── effective liquidity



Il premio viene calcolato al reveal, non al claim.



Quindi:



reveal

   ↓

tier

   ↓

effectivePool

   ↓

payout



e immediatamente:



il payout viene cristallizzato.



10. Floor del premio

Il minimo assoluto è:



2 USDM



Quindi concettualmente:



payout =

max(

    calculatedPrize,

    2 USDM

)



sempre nel rispetto delle regole di solvibilità definite dal protocollo.



Il valore viene visualizzato in USDM anche quando il pagamento effettivo avviene tramite ADA/PRE/USDM o combinazione.



11. Ticket vincente

Al reveal:



UNREVEALED

     ↓

REVEALED WIN



vengono fissati on-chain:



tier

payoutUSDM

result

claimability

expiry



Da quel momento il payout non cambia più.



Non importa se il giocatore aspetta:



un giorno;

una settimana;

un mese;

quasi tutta la validità.

Il premio rimane quello determinato al reveal.



Questo evita l'incentivo perverso a ritardare la grattata.



12. Scadenza

Durata iniziale:



365 giorni minimo.



La data viene fissata alla creazione:



issuedAt

expiresAt = issuedAt + 365 days



Non viene ricalcolata al reveal.



La scadenza rappresenta principalmente la fine del diritto economico, non necessariamente la cancellazione dell'esistenza del ticket.



13. Reveal dopo scadenza

Vogliamo mantenere una caratteristica interessante:



anche dopo la scadenza può essere possibile rivelare il ticket per conoscere/verificare il risultato storico.



Quindi:



expired ticket

      ↓

reveal

      ↓

WIN / LOSS



ma:



expired winning ticket

      ↓

no economic claim



Questo permette di conservare anche ticket storici.



La UX può mostrare:



"Questo ticket avrebbe vinto X USDM, ma il diritto al pagamento è scaduto."



14. Ticket vincente come NFT collezionabile

Il ticket non viene bruciato automaticamente al claim.



Dopo il claim:



Ticket #123

Status: CLAIMED

Historical prize: 12,481 USDM



l'NFT può restare nel wallet.



Questo consente di conservare:



grandi vincite;

jackpot;

ticket rari;

record storici.

Il ticket diventa quindi contemporaneamente:



game asset

+

proof/history

+

collectible



15. Claim

Il premio può essere reclamato una sola volta.



La proprietà dell'NFT non determina automaticamente la distruzione dell'asset.



Il claim porta lo stato:



CLAIMABLE

    ↓

CLAIMED



Il validator deve rendere impossibile:



CLAIMED → CLAIMED + secondo payout



Il double claim deve essere impossibile on-chain.



16. Burn

Il giocatore decide.



Può:



CLAIM

+

KEEP NFT



oppure:



CLAIM

+

BURN NFT



Il burn non dà diritto a un pagamento.



Per sicurezza, un ticket vincente non dovrebbe poter essere bruciato accidentalmente prima di aver gestito il diritto economico.



Un ticket già claimato può essere bruciato volontariamente.



17. Secondary market

Il ticket non rivelato deve poter essere trasferito:



Alice

 ↓

Bob

 ↓

Charlie

 ↓

Reveal



Il diritto economico segue il ticket, non necessariamente l'acquirente originale.



Anche un ticket vincente non reclamato dovrebbe poter essere trasferito:



Alice reveal

 ↓

WIN 10,000 USDM

 ↓

Alice → Bob

 ↓

Bob claims 10,000 USDM



Questo apre la possibilità di un mercato secondario sia per:



blind tickets;

winning tickets;

jackpot tickets;

ticket storici.

18. Proprietà fondamentale del secondary market

Il trasferimento di un ticket non deve rivelare il risultato.



Non deve esistere un meccanismo per cui:



transfer

 ↓

winning status



diventa deducibile prima del reveal.



Tutti i ticket non rivelati devono avere la stessa struttura pubblica.



19. PrizePool

Il vecchio modello:



ClaimIndex

Refill

RevealSeed



non deve essere il cuore del B1.



La PrizePool diventa una vera riserva condivisa di liquidità.



Il valore effettivo viene dalla liquidità on-chain.



Le liability dei ticket già rivelati devono essere contabilizzate in modo tale che il protocollo non spenda come "libero" denaro già economicamente promesso.



20. Treasury → PrizePool

Il Treasury alimenta automaticamente la PrizePool secondo la percentuale prevista.



Non:



Treasury → tdPrizePkh



come semplice destinatario amministrativo.



Ma:



Treasury

   ↓

PrizePool script



con vincoli on-chain.



21. Nessun backend fiduciario

Il backend può:



costruire transazioni;

indicizzare dati;

notificare l'utente;

fornire UX;

facilitare reveal/claim.

Ma non può decidere:



winner

prize

randomness

jackpot

treasury allocation

claim validity



Queste cose devono essere determinate/verificate dai validator e dagli asset on-chain.



22. La frase costituzionale più importante

Questa la metterei letteralmente nella documentazione B1:



Nessuna informazione pubblicamente disponibile prima del reveal di un ticket deve consentire di determinare o dedurre in modo significativo il simbolo, il tier, il premio o l'eventuale jackpot associato a quel ticket.



È una proprietà che dovrà essere testata, non soltanto dichiarata.



23.  vincoli:



prima leggere tutto il repository;

leggere tutta poc/;

non assumere API o datum inesistenti;

mantenere compatibilità con le parti già corrette;

aggiornare tutti i file interdipendenti;

aggiornare test;

aggiornare POC;

compilare;

eseguire test;

non dichiarare B1 pronto se esistono incongruenze tra Plutus e off-chain.

E soprattutto:



non implementare una soluzione "simile" al requisito: implementare gli invarianti come proprietà verificabili.