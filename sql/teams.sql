-- =====================================================
-- INSERT LEAGUES - TENNIS
-- =====================================================

INSERT INTO leagues (sport_type_id, name, country_code, level)
SELECT id, 'Laver Cup', NULL, 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'Olympic Tennis Tournament', NULL, 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'ITF World Tennis Tour', NULL, 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'ATP Finals', NULL, 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'WTA Finals', NULL, 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'United Cup', NULL, 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'Hopman Cup', NULL, 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'Masters 1000 - Indian Wells', 'US', 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'Masters 1000 - Miami Open', 'US', 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'Masters 1000 - Monte-Carlo Masters', 'MC', 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'Masters 1000 - Madrid Open', 'ES', 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'Masters 1000 - Italian Open', 'IT', 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'Masters 1000 - Canadian Open', 'CA', 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'Masters 1000 - Cincinnati Masters', 'US', 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'Masters 1000 - Shanghai Masters', 'CN', 'international' FROM sport_types WHERE name = 'Tennis'
UNION ALL SELECT id, 'Masters 1000 - Paris Masters', 'FR', 'international' FROM sport_types WHERE name = 'Tennis'
ON CONFLICT DO NOTHING;


-- =====================================================
-- INSERT LEAGUES - CRICKET
-- =====================================================

INSERT INTO leagues (sport_type_id, name, country_code, level)
SELECT id, 'ICC World Test Championship', NULL, 'international' FROM sport_types WHERE name = 'Cricket'
UNION ALL SELECT id, 'ICC Champions Trophy', NULL, 'international' FROM sport_types WHERE name = 'Cricket'
UNION ALL SELECT id, 'Women''s Cricket World Cup', NULL, 'international' FROM sport_types WHERE name = 'Cricket'
UNION ALL SELECT id, 'Women''s T20 World Cup', NULL, 'international' FROM sport_types WHERE name = 'Cricket'
UNION ALL SELECT id, 'Asia Cup', NULL, 'international' FROM sport_types WHERE name = 'Cricket'
UNION ALL SELECT id, 'Sheffield Shield', 'AU', 'national' FROM sport_types WHERE name = 'Cricket'
UNION ALL SELECT id, 'Ranji Trophy', 'IN', 'national' FROM sport_types WHERE name = 'Cricket'
UNION ALL SELECT id, 'Quaid-e-Azam Trophy', 'PK', 'national' FROM sport_types WHERE name = 'Cricket'
UNION ALL SELECT id, 'Duleep Trophy', 'IN', 'national' FROM sport_types WHERE name = 'Cricket'
UNION ALL SELECT id, 'Vijay Hazare Trophy', 'IN', 'national' FROM sport_types WHERE name = 'Cricket'
UNION ALL SELECT id, 'Vitality Blast', 'GB', 'national' FROM sport_types WHERE name = 'Cricket'
UNION ALL SELECT id, 'Super Smash', 'NZ', 'national' FROM sport_types WHERE name = 'Cricket'
UNION ALL SELECT id, 'Lanka Premier League (LPL)', 'LK', 'national' FROM sport_types WHERE name = 'Cricket'
UNION ALL SELECT id, 'CSA T20 Challenge', 'ZA', 'national' FROM sport_types WHERE name = 'Cricket'
ON CONFLICT DO NOTHING;

-- =====================================================
-- INSERT LEAGUES - RUGBY (Expanded)
-- =====================================================

INSERT INTO leagues (sport_type_id, name, country_code, level)
SELECT id, 'Coupe du Monde de Rugby' , NULL, 'international'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Six Nations' , NULL, 'international'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Rugby Championship' , NULL, 'international'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Top 14' , 'FR' , 'national'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Premiership Rugby' , 'GB' , 'national'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'United Rugby Championship' , NULL, 'international'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Super Rugby' , NULL, 'international'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'European Rugby Champions Cup' , 'EU' , 'international'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'European Rugby Challenge Cup' , 'EU' , 'international'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'National Rugby League (NRL)' , 'AU' , 'national'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Super League' , 'GB' , 'national'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Currie Cup' , 'ZA' , 'national'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Mitre 10 Cup' , 'NZ' , 'national'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Major League Rugby (MLR)' , 'US' , 'national'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Japan Rugby League One' , 'JP' , 'national'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Pro D2' , 'FR' , 'second-tier'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'RFU Championship' , 'GB' , 'second-tier'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Pacific Nations Cup' , NULL, 'international'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'World Rugby Sevens Series' , NULL, 'international'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Rugby World Cup Sevens' , NULL, 'international'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Women''s Rugby World Cup' , NULL, 'international'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Six Nations Feminin' , NULL, 'international'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Rugby Americas North Championship' , 'NA' , 'regional'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Asia Rugby Championship' , 'AS' , 'regional'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Africa Cup' , 'AF' , 'regional'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'South American Rugby Championship' , 'SA' , 'regional'  FROM sport_types WHERE name = 'Rugby' 
UNION ALL SELECT id, 'Oceania Rugby Cup' , 'OC' , 'regional'  FROM sport_types WHERE name = 'Rugby' 
ON CONFLICT DO NOTHING;


-- =====================================================
-- INSERT LEAGUES - AMERICAN FOOTBALL (Expanded)
-- =====================================================

INSERT INTO leagues (sport_type_id, name, country_code, level) 
SELECT id, 'NFL' , 'US' , 'national'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'NCAA Football' , 'US' , 'national'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'CFL' , 'CA' , 'national'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'USFL' , 'US' , 'professional'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'XFL' , 'US' , 'professional'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'European League of Football' , NULL, 'international'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'Indoor Football League (IFL)' , 'US' , 'national'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'Arena Football League' , 'US' , 'national'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'Fan Controlled Football' , 'US' , 'professional'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'Spring League' , 'US' , 'developmental'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'Liga de Fútbol Americano Profesional' , 'MX' , 'national'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'German Football League (GFL)' , 'DE' , 'national'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'Austrian Football League (AFL)' , 'AT' , 'national'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'Japan X League' , 'JP' , 'national'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'BAFA National Leagues' , 'GB' , 'national'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'CEFL Cup' , NULL, 'international'  FROM sport_types WHERE name = 'Football Américain' 
UNION ALL SELECT id, 'IFAF World Championship' , NULL, 'international'  FROM sport_types WHERE name = 'Football Américain' 
ON CONFLICT DO NOTHING;


-- =====================================================
-- INSERT LEAGUES - BASEBALL (Expanded)
-- =====================================================

INSERT INTO leagues (sport_type_id, name, country_code, level) 
SELECT id, 'MLB' , 'US' , 'national'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'NPB (Japan)' , 'JP' , 'national'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'KBO (South Korea)' , 'KR' , 'national'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'CPBL (Taiwan)' , 'TW' , 'national'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'LMB (Mexico)' , 'MX' , 'national'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'Serie Nacional de Cuba' , 'CU' , 'national'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'LVBP (Venezuela)' , 'VE' , 'national'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'LMP (Mexico Pacific League)' , 'MX' , 'winter'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'LIDOM (Dominican Republic)' , 'DO' , 'winter'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'ABL (Australian Baseball League)' , 'AU' , 'national'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'KBL (Korea Baseball Futures League)' , 'KR' , 'second-tier'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'Chinese Baseball League (CBL)' , 'CN' , 'national'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'Euro Baseball League' , NULL, 'international'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'Baseball World Cup' , NULL, 'international'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'Olympic Baseball' , NULL, 'international'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'Caribbean Series' , NULL, 'international'  FROM sport_types WHERE name = 'Baseball' 
UNION ALL SELECT id, 'World Baseball Classic' , NULL, 'international'  FROM sport_types WHERE name = 'Baseball' 
ON CONFLICT DO NOTHING;


-- =====================================================
-- INSERT LEAGUES - BASKETBALL (Expanded)
-- =====================================================

INSERT INTO leagues (sport_type_id, name, country_code, level) 
SELECT id, 'NBA' , 'US' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'WNBA' , 'US' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'EuroLeague' , NULL, 'international'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'EuroCup' , NULL, 'international'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'FIBA Basketball World Cup' , NULL, 'international'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'NBA G League' , 'US' , 'second-tier'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'NCAA Basketball' , 'US' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'Basketball Africa League (BAL)' , NULL, 'continental'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'ACB (Spain)' , 'ES' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'LNB Pro A (France)' , 'FR' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'Basketball Bundesliga (Germany)' , 'DE' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'Lega Basket Serie A (Italy)' , 'IT' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'Turkish Basketball Super League' , 'TR' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'VTB United League' , NULL, 'international'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'CBA (China)' , 'CN' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'NBL (Australia)' , 'AU' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'KBL (South Korea)' , 'KR' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'B.League (Japan)' , 'JP' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'Liga Nacional de Básquet (Argentina)' , 'AR' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'NBB (Brazil)' , 'BR' , 'national'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'FIBA Americas Championship' , NULL, 'continental'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'FIBA Asia Cup' , NULL, 'continental'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'AfroBasket' , NULL, 'continental'  FROM sport_types WHERE name = 'Basketball' 
UNION ALL SELECT id, 'EuroBasket' , NULL, 'continental'  FROM sport_types WHERE name = 'Basketball' 
ON CONFLICT DO NOTHING;


-- =====================================================
-- INSERT LEAGUES - HOCKEY (Expanded)
-- =====================================================

INSERT INTO leagues (sport_type_id, name, country_code, level) 
SELECT id, 'NHL' , 'US' , 'national'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'KHL' , NULL, 'international'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'SHL (Sweden)' , 'SE' , 'national'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'Liiga (Finland)' , 'FI' , 'national'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'DEL (Germany)' , 'DE' , 'national'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'NLA (Switzerland)' , 'CH' , 'national'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'Czech Extraliga' , 'CZ' , 'national'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'SM-liiga (Finland)' , 'FI' , 'national'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'Champions Hockey League' , NULL, 'international'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'AHL (North America)' , 'US' , 'second-tier'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'ECHL' , 'US' , 'third-tier'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'EIHL (UK)' , 'GB' , 'national'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'Ligue Magnus (France)' , 'FR' , 'national'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'Alps Hockey League' , NULL, 'international'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'IIHF World Championship' , NULL, 'international'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'World Juniors (IIHF)' , NULL, 'international'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'Olympic Ice Hockey' , NULL, 'international'  FROM sport_types WHERE name = 'Hockey' 
UNION ALL SELECT id, 'Spengler Cup' , 'CH' , 'international'  FROM sport_types WHERE name = 'Hockey' 
ON CONFLICT DO NOTHING;


-- =====================================================
-- INSERT LEAGUES - VOLLEYBALL (Expanded)
-- =====================================================

INSERT INTO leagues (sport_type_id, name, country_code, level) 
SELECT id, 'FIVB Volleyball World Championship' , NULL, 'international'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'FIVB Volleyball Nations League' , NULL, 'international'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'Olympic Volleyball' , NULL, 'international'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'CEV Champions League' , NULL, 'international'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'Serie A1 (Italy)' , 'IT' , 'national'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'Ligue A (France)' , 'FR' , 'national'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'Superliga (Brazil)' , 'BR' , 'national'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'Bundesliga (Germany)' , 'DE' , 'national'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'Turkish Volleyball League' , 'TR' , 'national'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'V.League (Japan)' , 'JP' , 'national'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'V-League (South Korea)' , 'KR' , 'national'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'Polish PlusLiga' , 'PL' , 'national'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'Russian Superleague' , 'RU' , 'national'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'Liga Argentina de Voleibol' , 'AR' , 'national'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'FIVB World Cup' , NULL, 'international'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'FIVB World Grand Champions Cup' , NULL, 'international'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'AVC Asian Championship' , NULL, 'continental'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'CEV European Championship' , NULL, 'continental'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'CAVB African Championship' , NULL, 'continental'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'NORCECA Championship' , NULL, 'continental'  FROM sport_types WHERE name = 'Volleyball' 
UNION ALL SELECT id, 'CSV South American Championship' , NULL, 'continental'  FROM sport_types WHERE name = 'Volleyball' 
ON CONFLICT DO NOTHING;


-- =====================================================
-- INSERT LEAGUES - HANDBALL (Expanded)
-- =====================================================

INSERT INTO leagues (sport_type_id, name, country_code, level) 
SELECT id, 'IHF World Championship' , NULL, 'international'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'EHF Champions League' , NULL, 'international'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'Olympic Handball' , NULL, 'international'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'Bundesliga (Germany)' , 'DE' , 'national'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'LNH (France)' , 'FR' , 'national'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'Liga ASOBAL (Spain)' , 'ES' , 'national'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'Danish Handball League' , 'DK' , 'national'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'Norwegian Eliteserien' , 'NO' , 'national'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'Swedish Handbollsligan' , 'SE' , 'national'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'Polish Superliga' , 'PL' , 'national'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'Croatian First League' , 'HR' , 'national'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'EHF European Championship' , NULL, 'continental'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'Pan American Handball Championship' , NULL, 'continental'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'African Handball Championship' , NULL, 'continental'  FROM sport_types WHERE name = 'Handball' 
UNION ALL SELECT id, 'Asian Handball Championship' , NULL, 'continental'  FROM sport_types WHERE name = 'Handball' 
ON CONFLICT DO NOTHING;


-- =====================================================
-- INSERT LEAGUES - WATER POLO (Expanded)
-- =====================================================

INSERT INTO leagues (sport_type_id, name, country_code, level) 
SELECT id, 'FINA World Championship' , NULL, 'international'  FROM sport_types WHERE name = 'Water Polo' 
UNION ALL SELECT id, 'Olympic Water Polo' , NULL, 'international'  FROM sport_types WHERE name = 'Water Polo' 
UNION ALL SELECT id, 'LEN Champions League' , NULL, 'international'  FROM sport_types WHERE name = 'Water Polo' 
UNION ALL SELECT id, 'LEN Euro League' , NULL, 'international'  FROM sport_types WHERE name = 'Water Polo' 
UNION ALL SELECT id, 'Serie A1 (Italy)' , 'IT' , 'national'  FROM sport_types WHERE name = 'Water Polo' 
UNION ALL SELECT id, 'División de Honor (Spain)' , 'ES' , 'national'  FROM sport_types WHERE name = 'Water Polo' 
UNION ALL SELECT id, 'Greek Water Polo League' , 'GR' , 'national'  FROM sport_types WHERE name = 'Water Polo' 
UNION ALL SELECT id, 'Hungarian OB I' , 'HU' , 'national'  FROM sport_types WHERE name = 'Water Polo' 
UNION ALL SELECT id, 'Serbian League' , 'RS' , 'national'  FROM sport_types WHERE name = 'Water Polo' 
UNION ALL SELECT id, 'Croatian Premier League' , 'HR' , 'national'  FROM sport_types WHERE name = 'Water Polo' 
UNION ALL SELECT id, 'Romanian Liga Națională' , 'RO' , 'national'  FROM sport_types WHERE name = 'Water Polo' 
UNION ALL SELECT id, 'LEN European Championship' , NULL, 'continental'  FROM sport_types WHERE name = 'Water Polo' 
UNION ALL SELECT id, 'FINA World League' , NULL, 'international'  FROM sport_types WHERE name = 'Water Polo' 
ON CONFLICT DO NOTHING;


-- =====================================================
-- INSERT LEAGUES - TABLE TENNIS (Expanded)
-- =====================================================

INSERT INTO leagues (sport_type_id, name, country_code, level) 
SELECT id, 'ITTF World Championships' , NULL, 'international'  FROM sport_types WHERE name = 'Tennis de Table' 
UNION ALL SELECT id, 'ITTF World Tour' , NULL, 'international'  FROM sport_types WHERE name = 'Tennis de Table' 
UNION ALL SELECT id, 'Olympic Table Tennis' , NULL, 'international'  FROM sport_types WHERE name = 'Tennis de Table' 
UNION ALL SELECT id, 'ITTF World Cup' , NULL, 'international'  FROM sport_types WHERE name = 'Tennis de Table' 
UNION ALL SELECT id, 'Champions League' , NULL, 'international'  FROM sport_types WHERE name = 'Tennis de Table' 
UNION ALL SELECT id, 'Chinese Super League' , 'CN' , 'national'  FROM sport_types WHERE name = 'Tennis de Table' 
UNION ALL SELECT id, 'Bundesliga (Germany)' , 'DE' , 'national'  FROM sport_types WHERE name = 'Tennis de Table' 
UNION ALL SELECT id, 'French Pro A' , 'FR' , 'national'  FROM sport_types WHERE name = 'Tennis de Table' 
UNION ALL SELECT id, 'Japan Top League' , 'JP' , 'national'  FROM sport_types WHERE name = 'Tennis de Table' 
UNION ALL SELECT id, 'T.League (Japan)' , 'JP' , 'national'  FROM sport_types WHERE name = 'Tennis de Table' 
UNION ALL SELECT id, 'Russian Premier League' , 'RU' , 'national'  FROM sport_types WHERE name = 'Tennis de Table' 
UNION ALL SELECT id, 'Korean League' , 'KR' , 'national'  FROM sport_types WHERE name = 'Tennis de Table' 
ON CONFLICT DO NOTHING;


-- =====================================================
-- INSERT LEAGUES - BADMINTON (Expanded)
-- =====================================================

INSERT INTO leagues (sport_type_id, name, country_code, level) 
SELECT id, 'BWF World Championships' , NULL, 'international'  FROM sport_types WHERE name = 'Badminton' 
UNION ALL SELECT id, 'BWF World Tour' , NULL, 'international'  FROM sport_types WHERE name = 'Badminton' 
UNION ALL SELECT id, 'Olympic Badminton' , NULL, 'international'  FROM sport_types WHERE name = 'Badminton' 
UNION ALL SELECT id, 'All England Open' , 'GB' , 'international'  FROM sport_types WHERE name = 'Badminton' 
UNION ALL SELECT id, 'BWF Thomas Cup' , NULL, 'international'  FROM sport_types WHERE name = 'Badminton' 
UNION ALL SELECT id, 'BWF Uber Cup' , NULL, 'international'  FROM sport_types WHERE name = 'Badminton' 
UNION ALL SELECT id, 'BWF Sudirman Cup' , NULL, 'international'  FROM sport_types WHERE name = 'Badminton' 
UNION ALL SELECT id, 'China Open' , 'CN' , 'international'  FROM sport_types WHERE name = 'Badminton' 
UNION ALL SELECT id, 'Indonesia Open' , 'ID' , 'international'  FROM sport_types WHERE name = 'Badminton' 
UNION ALL SELECT id, 'Malaysia Open' , 'MY' , 'international'  FROM sport_types WHERE name = 'Badminton' 
UNION ALL SELECT id, 'Denmark Open' , 'DK' , 'international'  FROM sport_types WHERE name = 'Badminton' 
UNION ALL SELECT id, 'Japan Open' , 'JP' , 'international'  FROM sport_types WHERE name = 'Badminton' 
UNION ALL SELECT id, 'India Open' , 'IN' , 'international'  FROM sport_types WHERE name = 'Badminton' 
UNION ALL SELECT id, 'Premier Badminton League (India)' , 'IN' , 'national'  FROM sport_types WHERE name = 'Badminton' 
ON CONFLICT DO NOTHING;


-- =====================================================
-- INSERT LEAGUES - FOOTBALL/SOCCER (Expanded)
-- =====================================================

INSERT INTO leagues (sport_type_id, name, country_code, level)
SELECT id, 'Coupe du Monde de la FIFA', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Coupe d''Afrique des Nations', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Copa América', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'UEFA European Championship', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'AFC Asian Cup', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'CONCACAF Gold Cup', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'OFC Nations Cup', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'UEFA Champions League', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'UEFA Europa League', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'UEFA Conference League', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'CAF Champions League', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'CAF Confederation Cup', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Copa Libertadores', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Copa Sudamericana', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'CONCACAF Champions League', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'AFC Champions League', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'OFC Champions League', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'FIFA Club World Cup', NULL, 'international' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Premier League', 'GB', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'La Liga', 'ES', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Bundesliga', 'DE', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Serie A', 'IT', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Ligue 1', 'FR', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Eredivisie', 'NL', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Primeira Liga', 'PT', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Belgian Pro League', 'BE', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Scottish Premiership', 'GB', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'MLS', 'US', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Liga MX', 'MX', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Brazilian Série A', 'BR', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Argentine Primera División', 'AR', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Chinese Super League', 'CN', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'J1 League', 'JP', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'K League 1', 'KR', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'A-League', 'AU', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Indian Super League', 'IN', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Saudi Pro League', 'SA', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Egyptian Premier League', 'EG', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'South African Premier Division', 'ZA', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Turkish Süper Lig', 'TR', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Russian Premier League', 'RU', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Ukrainian Premier League', 'UA', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Swiss Super League', 'CH', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Austrian Bundesliga', 'AT', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Danish Superliga', 'DK', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Norwegian Eliteserien', 'NO', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Swedish Allsvenskan', 'SE', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Greek Super League', 'GR', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Czech First League', 'CZ', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Polish Ekstraklasa', 'PL', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Romanian Liga I', 'RO', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Croatian First League', 'HR', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Serbian SuperLiga', 'RS', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Israeli Premier League', 'IL', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Botola Pro', 'MA', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Tunisian Ligue Professionnelle 1', 'TN', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Algerian Ligue Professionnelle 1', 'DZ', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Linafoot', 'CD', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Nigerian Professional Football League', 'NG', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Kenyan Premier League', 'KE', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Ghana Premier League', 'GH', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Ivorian Ligue 1', 'CI', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Senegalese Ligue 1', 'SN', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Cameroonian Elite One', 'CM', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Tanzanian Premier League', 'TZ', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Ugandan Premier League', 'UG', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Zambian Super League', 'ZM', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Zimbabwean Premier Soccer League', 'ZW', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Angolan Girabola', 'AO', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Mozambican Moçambola', 'MZ', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Rwandan National Football League', 'RW', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Burundian Ligue A', 'BI', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Malian Première Division', 'ML', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Guinean Ligue 1 Pro', 'GN', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Congolese Ligue 1', 'CG', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Gabonese Championnat National D1', 'GA', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Beninese Ligue 1', 'BJ', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Togolese Championnat National', 'TG', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Chadian Première Division', 'TD', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Central African Republic League', 'CF', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'South Sudanese Football Championship', 'SS', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Sudanese Premier League', 'SD', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Ethiopian Premier League', 'ET', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Djiboutian Division 1', 'DJ', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Somali First Division', 'SO', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Eritrean Premier League', 'ER', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Libyan Premier League', 'LY', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Mauritanian Ligue 1', 'MR', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Niger Premier League', 'NE', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Burkinabé Premier League', 'BF', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Sierra Leone National Premier League', 'SL', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Liberian First Division', 'LR', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Gambian GFA League', 'GM', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Cape Verdean Championship', 'CV', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'São Toméan Championship', 'ST', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Equatoguinean Primera División', 'GQ', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Namibian Premier League', 'NA', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Botswana Premier League', 'BW', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Lesotho Premier League', 'LS', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Swazi Premier League', 'SZ', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Malawian Super League', 'MW', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Malagasy THB Champions League', 'MG', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Mauritian League', 'MU', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Seychellois League', 'SC', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Comorian Premier League', 'KM', 'national' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Réunion Division d''Honneur', 'RE', 'regional' FROM sport_types WHERE name = 'Football'
UNION ALL SELECT id, 'Mayotte Division d''Honneur', 'YT', 'regional' FROM sport_types WHERE name = 'Football'
ON CONFLICT DO NOTHING;


-- =====================================================
-- INSERT TEAMS - FOOTBALL/SOCCER (Comprehensive Global Coverage)
-- =====================================================

INSERT INTO teams (name, short_name, country_code, sport_type_id, team_type)
-- England - Premier League
SELECT 'Manchester United' , 'MUN' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Manchester City' , 'MCI' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Liverpool' , 'LIV' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Chelsea' , 'CHE' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Arsenal' , 'ARS' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Tottenham Hotspur' , 'TOT' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Newcastle United' , 'NEW' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Aston Villa' , 'AVL' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Brighton & Hove Albion' , 'BHA' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'West Ham United' , 'WHU' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Everton' , 'EVE' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Leicester City' , 'LEI' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Wolverhampton Wanderers' , 'WOL' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Crystal Palace' , 'CRY' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Fulham' , 'FUL' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Brentford' , 'BRE' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Nottingham Forest' , 'NFO' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Bournemouth' , 'BOU' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Luton Town' , 'LUT' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Burnley' , 'BUR' , 'GB' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- Spain - La Liga
UNION ALL SELECT 'Real Madrid' , 'RMA' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Barcelona' , 'BAR' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Atlético Madrid' , 'ATM' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Sevilla FC' , 'SEV' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Real Sociedad' , 'RSO' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Real Betis' , 'BET' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Villarreal CF' , 'VIL' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Athletic Club' , 'ATH' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Valencia CF' , 'VAL' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Girona FC' , 'GIR' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Getafe CF' , 'GET' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Osasuna' , 'OSA' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Rayo Vallecano' , 'RAY' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Celta Vigo' , 'CEL' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Deportivo Alavés' , 'ALA' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'UD Las Palmas' , 'LPA' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Mallorca' , 'MLL' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Cádiz CF' , 'CAD' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Granada CF' , 'GRA' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Almería' , 'ALM' , 'ES' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- Germany - Bundesliga
UNION ALL SELECT 'Bayern Munich' , 'BAY' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Borussia Dortmund' , 'BVB' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'RB Leipzig' , 'RBL' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Bayer Leverkusen' , 'B04' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'VfB Stuttgart' , 'VFB' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Eintracht Frankfurt' , 'SGE' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Borussia Mönchengladbach' , 'BMG' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'VfL Wolfsburg' , 'WOB' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'SC Freiburg' , 'SCF' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'TSG Hoffenheim' , 'HOF' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Augsburg' , 'FCA' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Werder Bremen' , 'SVW' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT '1. FC Union Berlin' , 'FCU' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Mainz 05' , 'M05' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT '1. FC Köln' , 'KOE' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Hertha BSC' , 'BSC' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'VfL Bochum' , 'BOC' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Schalke 04' , 'S04' , 'DE' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- Italy - Serie A
UNION ALL SELECT 'Juventus' , 'JUV' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AC Milan' , 'ACM' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Inter Milan' , 'INT' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Roma' , 'ROM' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Napoli' , 'NAP' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Lazio' , 'LAZ' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Atalanta' , 'ATA' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Fiorentina' , 'FIO' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Torino' , 'TOR' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Bologna' , 'BOL' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Genoa' , 'GEN' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Sassuolo' , 'SAS' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Udinese' , 'UDI' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Cagliari' , 'CAG' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Empoli' , 'EMP' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Hellas Verona' , 'VER' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Lecce' , 'LEC' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Salernitana' , 'SAL' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Monza' , 'MON' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Spezia' , 'SPE' , 'IT' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- France - Ligue 1
UNION ALL SELECT 'Paris Saint-Germain' , 'PSG' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Olympique de Marseille' , 'OLM' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Olympique Lyonnais' , 'OLY' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Monaco' , 'ASM' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Lille OSC' , 'LIL' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Stade Rennais' , 'REN' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'OGC Nice' , 'NIC' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'RC Lens' , 'RCL' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'RC Strasbourg Alsace' , 'STR' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Montpellier HSC' , 'MON' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Stade Brestois 29' , 'BRE' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Nantes' , 'NAN' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Toulouse FC' , 'TFC' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Stade de Reims' , 'REI' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Le Havre AC' , 'HAV' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Lorient' , 'LOR' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Metz' , 'MET' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Clermont Foot 63' , 'CLE' , 'FR' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- Portugal - Primeira Liga
UNION ALL SELECT 'FC Porto' , 'POR' , 'PT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Benfica' , 'BEN' , 'PT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Sporting CP' , 'SCP' , 'PT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Sporting Braga' , 'BRA' , 'PT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Vitória SC' , 'VSC' , 'PT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Boavista FC' , 'BOA' , 'PT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Moreirense FC' , 'MOR' , 'PT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Rio Ave FC' , 'RIO' , 'PT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Gil Vicente FC' , 'GIL' , 'PT' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Famalicão' , 'FAM' , 'PT' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- Netherlands - Eredivisie
UNION ALL SELECT 'Ajax' , 'AJA' , 'NL' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'PSV Eindhoven' , 'PSV' , 'NL' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Feyenoord' , 'FEY' , 'NL' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AZ Alkmaar' , 'AZ' , 'NL' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Twente' , 'TWE' , 'NL' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Utrecht' , 'UTR' , 'NL' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'SC Heerenveen' , 'HEE' , 'NL' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Vitesse' , 'VIT' , 'NL' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- Brazil - Série A
UNION ALL SELECT 'Flamengo' , 'FLA' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Palmeiras' , 'PAL' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Corinthians' , 'COR' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'São Paulo FC' , 'SAO' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Internacional' , 'INT' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Atlético Mineiro' , 'CAM' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Fluminense' , 'FLU' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Santos FC' , 'SAN' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Grêmio' , 'GRE' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Botafogo' , 'BOT' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Vasco da Gama' , 'VAS' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Atlético Paranaense' , 'CAP' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Cruzeiro' , 'CRU' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Fortaleza' , 'FOR' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Bahia' , 'BAH' , 'BR' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- Argentina - Primera División
UNION ALL SELECT 'Boca Juniors' , 'BOC' , 'AR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'River Plate' , 'RIV' , 'AR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Racing Club' , 'RAC' , 'AR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Independiente' , 'IND' , 'AR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'San Lorenzo' , 'SLO' , 'AR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Vélez Sarsfield' , 'VEL' , 'AR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Estudiantes' , 'EST' , 'AR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Talleres' , 'TAL' , 'AR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Lanús' , 'LAN' , 'AR' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Newell''s Old Boys' , 'NOB' , 'AR' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- United States - MLS
UNION ALL SELECT 'LA Galaxy' , 'LAG' , 'US' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Seattle Sounders FC' , 'SEA' , 'US' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Atlanta United FC' , 'ATL' , 'US' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Inter Miami CF' , 'MIA' , 'US' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'New York City FC' , 'NYC' , 'US' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Portland Timbers' , 'POR' , 'US' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'LAFC' , 'LFC' , 'US' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Toronto FC' , 'TOR' , 'CA' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Vancouver Whitecaps FC' , 'VAN' , 'CA' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'CF Montréal' , 'MTL' , 'CA' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- Mexico - Liga MX
UNION ALL SELECT 'Club América' , 'AME' , 'MX' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Guadalajara (Chivas)' , 'GDL' , 'MX' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Cruz Azul' , 'CAZ' , 'MX' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'UNAM' , 'PUM' , 'MX' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Monterrey' , 'MTY' , 'MX' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Tigres UANL' , 'TIG' , 'MX' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Santos Laguna' , 'TSM' , 'MX' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Toluca' , 'TOL' , 'MX' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'León' , 'LEO' , 'MX' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Atlas' , 'ATL' , 'MX' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- Egypt
UNION ALL SELECT 'Al Ahly' , 'AHL' , 'EG' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Zamalek' , 'ZAM' , 'EG' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Pyramids FC' , 'PYR' , 'EG' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Ismaily SC' , 'ISM' , 'EG' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Al Masry' , 'MAS' , 'EG' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- South Africa
UNION ALL SELECT 'Kaizer Chiefs' , 'KAI' , 'ZA' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Orlando Pirates' , 'ORL' , 'ZA' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Mamelodi Sundowns' , 'SUN' , 'ZA' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'SuperSport United' , 'SSU' , 'ZA' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Amazulu FC' , 'AMA' , 'ZA' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- Morocco
UNION ALL SELECT 'Wydad Casablanca' , 'WYD' , 'MA' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Raja Casablanca' , 'RAJ' , 'MA' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FUS Rabat' , 'FUS' , 'MA' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'RS Berkane' , 'RSB' , 'MA' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Maghreb de Fès' , 'MASF' , 'MA' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- Tunisia
UNION ALL SELECT 'Espérance de Tunis' , 'EST' , 'TN' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Étoile du Sahel' , 'ESS' , 'TN' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Club Africain' , 'CAF' , 'TN' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'CS Sfaxien' , 'CSS' , 'TN' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- Algeria
UNION ALL SELECT 'JS Kabylie' , 'JSK' , 'DZ' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'USM Alger' , 'USM' , 'DZ' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'MC Alger' , 'MCA' , 'DZ' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'CR Belouizdad' , 'CRB' , 'DZ' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'ES Sétif' , 'ESS' , 'DZ' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- ==========================================
-- DR CONGO (Congo-Kinshasa) - Full Clubs List
-- ==========================================

UNION ALL SELECT 'TP Mazembe' , 'TPM' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Vita Club' , 'VIT' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'DC Motema Pembe' , 'DCM' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Saint-Éloi Lupopo' , 'LUP' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Maniema Union' , 'MAN' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'CS Don Bosco' , 'DON' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Dauphin Noir' , 'DAU' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Renaissance du Congo' , 'REN' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Mont Bleu' , 'MBL' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'OC Bukavu Dawa' , 'BUK' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'CS Makiso' , 'MAK' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AC Rangers' , 'RAN' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 

-- Additional Linafoot & Regional Clubs
UNION ALL SELECT 'JS Kinshasa' , 'JSK' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Les Aigles du Congo' , 'AIG' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'Céleste FC' , 'CEL' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Blessing' , 'BLE' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Lubumbashi Sport' , 'LSP' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'US Panda B52' , 'PAN' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'SM Sanga Balende' , 'SAN' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'US Tshinkunku' , 'TSH' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Simba Kolwezi' , 'SIM' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Kuya Sport' , 'KUY' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Nyuki' , 'NYU' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'OC Muungano' , 'MUN' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Etoile du Kivu' , 'EDK' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AC Kuya Sport' , 'AKU' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'CS Imana' , 'IMA' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'OC Idimu' , 'IDI' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'SC Rojolu' , 'ROJ' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'JS Bazano' , 'BAZ' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'US Lubero' , 'LUB' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Tanganyika' , 'TAN' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Kabasha' , 'KAB' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Simba Kamikaze' , 'KAM' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Dragons Bilima' , 'DRA' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'CS Imana Matete' , 'IMA2' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Petrokin' , 'PET' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AC Sodigraf' , 'SOD' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Arc-En-Ciel' , 'ARC' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AC Bandal' , 'BAN' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'US Bilombe' , 'BIL' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Océan Pacifique' , 'OCP' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'CS Elikya' , 'ELI' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Etoile de Kivu' , 'ETK' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC 31e CPC' , 'CPC' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'JS Likasi' , 'LIK' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Tanganyika Kalemie' , 'TKA' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS PJSK' , 'PJS' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Fandja' , 'FAN' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AC Mapenda' , 'MAP' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Lokole' , 'LOK' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Dynamique Kindu' , 'DYN' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Ouragan' , 'OUR' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'US Tshikapa' , 'TSK' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Nika' , 'NIK' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'CS Eldorado' , 'ELD' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AC Sodigraf Kinshasa' , 'SGK' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Malole' , 'MAL' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Ndombe' , 'NDM' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Vutuka' , 'VUT' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Lokolo Moto' , 'LOM' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Simba Mbujimayi' , 'SMB' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'FC Normandale' , 'NOR' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'US Imana Kisangani' , 'USI' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AS Kasaï' , 'KAS' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
UNION ALL SELECT 'AC Imana Kinshasa' , 'AIK' , 'CD' , id, 'club'  FROM sport_types WHERE name = 'Football' 
ON CONFLICT DO NOTHING;