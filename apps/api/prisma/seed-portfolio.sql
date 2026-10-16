INSERT INTO publications (id, user_id, title, venue, year, kind, updated_at)
SELECT gen_random_uuid(), u.id, v.title, v.venue, v.year, v.kind::"PublicationKind", now()
FROM users u
CROSS JOIN (
  VALUES
    (U&'D\00E9tection d''anomalies dans les s\00E9ries de capteurs', 'IEEE Access', 2026, 'ARTICLE'),
    (U&'Vision de s\00E9quences pour l''imagerie', 'Springer', 2025, 'ARTICLE'),
    (U&'Un protocole ouvert de collecte', 'Elsevier', 2025, 'ARTICLE'),
    (U&'Qualit\00E9 des jeux de donn\00E9es exp\00E9rimentaux', 'ACM', 2024, 'ARTICLE'),
    (U&'Suivi longitudinal d''un corpus de laboratoire', 'HAL', 2024, 'ARTICLE'),
    (U&'Retour sur le chapitre m\00E9thodologique', U&'Conf\00E9rence nationale', 2026, 'CONFERENCE'),
    (U&'Atelier donn\00E9es et reproductibilit\00E9', 'Workshop', 2025, 'CONFERENCE'),
    (U&'Poster de mi-parcours', U&'Journ\00E9e doctorale', 2025, 'CONFERENCE')
) AS v(title, venue, year, kind)
WHERE u.email IN ('camille.demo@example.test', 'demo.doctorant@example.test')
  AND NOT EXISTS (SELECT 1 FROM publications p WHERE p.user_id = u.id);

INSERT INTO portfolio_projects (id, user_id, title, summary, updated_at)
SELECT gen_random_uuid(), u.id, v.title, v.summary, now()
FROM users u
CROSS JOIN (
  VALUES
    (U&'Jeu de donn\00E9es du chapitre 2', U&'Corpus utilis\00E9 pour les exp\00E9riences en cours.'),
    (U&'Protocole exp\00E9rimental', U&'Proc\00E9dure de collecte et de contr\00F4le.')
) AS v(title, summary)
WHERE u.email IN ('camille.demo@example.test', 'demo.doctorant@example.test')
  AND NOT EXISTS (SELECT 1 FROM portfolio_projects p WHERE p.user_id = u.id);

INSERT INTO portfolio_skills (id, user_id, label)
SELECT gen_random_uuid(), u.id, v.label
FROM users u
CROSS JOIN (
  VALUES
    ('Python'),
    (U&'Analyse de donn\00E9es'),
    (U&'R\00E9daction scientifique')
) AS v(label)
WHERE u.email IN ('camille.demo@example.test', 'demo.doctorant@example.test')
  AND NOT EXISTS (SELECT 1 FROM portfolio_skills s WHERE s.user_id = u.id AND s.label = v.label);
