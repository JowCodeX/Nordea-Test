// src/types/spar.d.ts
export interface SparResponse {
    Envelope?: {
    Body?: {
        PersonsokResponse?: {
    SPARPersonsokningSvar?: {
            PersonsokningSvarspost?: {
            Status?: string;
            Namn?: {
                Fornamn?: string;
                Efternamn?: string;
            };
            Persondetaljer?: {
                Fodelsedatum?: string;
            };
            Folkbokforingsadress?: {
                SvenskAdress?: {
                Utdelningsadress2?: string;
                PostNr?: string;
                Postort?: string;
                };
            };
            };
        };
        };
    };
    };
}