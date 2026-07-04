-- =====================================================================
-- Programa técnico — Jiu Jitsu / Adultos (curriculum base, sin videos)
-- =====================================================================
-- Uso: reemplaza __ACADEMY__ por el NOMBRE EXACTO de tu academia en prod
-- y ejecuta este script contra la BD de producción (Railway).
-- Es IDEMPOTENTE: no duplica técnicas que ya existan (match por nombre+cinturón).
-- Requiere que la academia ya tenga la disciplina "Jiu Jitsu" con la
-- categoría "Adultos" y sus cinturones (Blanco..Negro) creados.
-- =====================================================================

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Montada (Mount)', 'Control dominante desde arriba, rodillas al piso y buena postura.', 'Posición', 0, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Montada (Mount)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Control lateral / Cien kilos', 'Inmovilización pesada al costado tras pasar la guardia.', 'Posición', 1, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Control lateral / Cien kilos');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Norte-sur (North-south)', 'Control por la cabeza, cadera sobre el pecho del oponente.', 'Posición', 2, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Norte-sur (North-south)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Rodilla en la panza (Knee on belly)', 'Control móvil y de presión, transición y amenaza de ataques.', 'Posición', 3, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Rodilla en la panza (Knee on belly)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Guardia cerrada (Closed Guard)', 'Controlas al oponente con las piernas cerradas en su cintura.', 'Guardia', 4, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Guardia cerrada (Closed Guard)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Escape de la montada (Upa / puente)', 'Puente de cadera para invertir desde abajo de la montada.', 'Escape', 5, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Escape de la montada (Upa / puente)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Fuga de cadera (Shrimp / hip escape)', 'Movimiento base para recomponer guardia y escapar.', 'Escape', 6, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Fuga de cadera (Shrimp / hip escape)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Estrangulación de cruz (Cross-collar choke)', 'Estrangulación con las solapas desde la guardia o la montada.', 'Sumisión', 7, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Estrangulación de cruz (Cross-collar choke)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Mata León (Rear Naked Choke)', 'Estrangulación desde la espalda con el brazo en el cuello.', 'Sumisión', 8, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Mata León (Rear Naked Choke)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Llave de brazo (Armbar)', 'Hiperextensión del codo desde la guardia o la montada.', 'Sumisión', 9, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Llave de brazo (Armbar)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Triángulo', 'Estrangulación con las piernas formando un triángulo.', 'Sumisión', 10, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Triángulo');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Kimura', 'Llave de hombro en figura-4 (rotación interna).', 'Sumisión', 11, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Kimura');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Americana (Keylock)', 'Llave de hombro en figura-4 (rotación externa) desde side/mount.', 'Sumisión', 12, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Americana (Keylock)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Guillotina', 'Estrangulación frontal de cuello.', 'Sumisión', 13, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Guillotina');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Footlock recto (Straight ankle lock)', 'Única llave de pierna legal en blanco: compresión recta del tobillo.', 'Sumisión', 14, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Footlock recto (Straight ankle lock)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Rompimiento de postura', 'Quebrar la base del oponente para atacar desde la guardia.', 'Fundamento', 15, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Rompimiento de postura');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Caídas / Ukemi', 'Caer seguro para entrenar barridas y proyecciones.', 'Fundamento', 16, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Blanco'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Caídas / Ukemi');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Guardia de araña (Spider Guard)', 'Control de mangas con los pies en los bíceps.', 'Guardia', 0, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Azul'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Guardia de araña (Spider Guard)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Guardia lazo (Lasso Guard)', 'Enrollas la pierna en el brazo para controlar el pasaje.', 'Guardia', 1, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Azul'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Guardia lazo (Lasso Guard)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Media guardia con underhook', 'Media guardia ofensiva buscando la espalda o barrida.', 'Guardia', 2, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Azul'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Media guardia con underhook');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Pasaje toreando (Toreando)', 'Pasar la guardia controlando las piernas y rodeando.', 'Pasaje', 3, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Azul'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Pasaje toreando (Toreando)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Pasaje knee cut (rodilla cortante)', 'Pasaje cortando con la rodilla a través de la guardia.', 'Pasaje', 4, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Azul'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Pasaje knee cut (rodilla cortante)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Barrida de tijera (Scissor sweep)', 'Barrida desde la guardia usando las piernas como tijera.', 'Barrida', 5, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Azul'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Barrida de tijera (Scissor sweep)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Flower sweep (Péndulo)', 'Barrida pendular desde la guardia cerrada.', 'Barrida', 6, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Azul'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Flower sweep (Péndulo)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Omoplata', 'Llave de hombro con las piernas desde la guardia.', 'Sumisión', 7, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Azul'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Omoplata');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Estrangulación bow and arrow', 'Estrangulación desde la espalda con control de pierna.', 'Sumisión', 8, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Azul'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Estrangulación bow and arrow');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Estrangulación Ezekiel', 'Estrangulación con el antebrazo, incluso desde la montada.', 'Sumisión', 9, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Azul'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Estrangulación Ezekiel');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'D''arce / Anaconda', 'Estrangulaciones de cabeza-brazo desde el frente/turtle.', 'Sumisión', 10, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Azul'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'D''arce / Anaconda');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Wrist lock (llave de muñeca)', 'Legal desde azul: compresión/torsión de la muñeca.', 'Sumisión', 11, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Azul'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Wrist lock (llave de muñeca)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Guardia De la Riva', 'Gancho en la pierna del oponente para controlar de pie.', 'Guardia', 0, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Morado'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Guardia De la Riva');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'X-Guard', 'Control por debajo con las piernas en X para barrer.', 'Guardia', 1, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Morado'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'X-Guard');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Berimbolo (introducción)', 'Inversión para tomar la espalda desde guardias de gancho.', 'Guardia', 2, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Morado'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Berimbolo (introducción)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Toma de espalda + cinturón de seguridad', 'Control de la espalda con ganchos y agarre seguro.', 'Posición', 3, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Morado'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Toma de espalda + cinturón de seguridad');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Pasaje over-under (presión)', 'Pasaje de presión, un brazo arriba y otro abajo.', 'Pasaje', 4, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Morado'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Pasaje over-under (presión)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Leg drag', 'Pasaje arrastrando la pierna cruzada para controlar.', 'Pasaje', 5, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Morado'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Leg drag');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Kneebar', 'Legal desde morado: hiperextensión de la rodilla.', 'Sumisión', 6, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Morado'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Kneebar');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Clock choke (estrangulación de reloj)', 'Estrangulación desde turtle / cuatro apoyos.', 'Sumisión', 7, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Morado'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Clock choke (estrangulación de reloj)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Estrangulación brazo-cabeza (Kata-gatame)', 'Arm-triangle desde side control o montada.', 'Sumisión', 8, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Morado'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Estrangulación brazo-cabeza (Kata-gatame)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Ashi Garami / SLX', 'Entanglements de pierna (single-leg X, 50/50) para atacar piernas.', 'Pierna', 0, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Café'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Ashi Garami / SLX');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Toe hold (llave de pie)', 'Legal desde café: torsión del pie/tobillo.', 'Sumisión', 1, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Café'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Toe hold (llave de pie)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Calf slicer (compresión de pantorrilla)', 'Legal desde café: compresión sobre la pantorrilla.', 'Sumisión', 2, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Café'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Calf slicer (compresión de pantorrilla)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Bicep slicer (compresión de bíceps)', 'Legal desde café: compresión sobre el bíceps.', 'Sumisión', 3, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Café'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Bicep slicer (compresión de bíceps)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Cadena de footlocks rectos', 'Encadenar footlocks y transiciones entre entanglements.', 'Sumisión', 4, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Café'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Cadena de footlocks rectos');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Berimbolo completo e inversiones', 'Sistema de inversiones para la espalda desde De la Riva.', 'Guardia', 5, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Café'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Berimbolo completo e inversiones');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Pasaje de presión avanzado', 'Sistemas de pasaje con presión y control de cadera.', 'Pasaje', 6, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Café'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Pasaje de presión avanzado');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Heel hook interno/externo (No-Gi)', 'Legal desde negro en No-Gi: torsión de la rodilla vía talón.', 'Sumisión', 0, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Negro'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Heel hook interno/externo (No-Gi)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Knee reaping / twisting locks (No-Gi)', 'Legal desde negro en No-Gi: reaping y torsiones de rodilla.', 'Sumisión', 1, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Negro'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Knee reaping / twisting locks (No-Gi)');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Sistema completo de leg locks', 'Conexión Ashi → transiciones → heel hook con control.', 'Sistema', 2, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Negro'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Sistema completo de leg locks');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Refinamiento de pasaje y timing', 'Conexión entre control, presión y pasaje a alto nivel.', 'Sistema', 3, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Negro'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Refinamiento de pasaje y timing');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Cadenas de ataque desde la espalda', 'Encadenar mata león, bow-and-arrow y armbar.', 'Sumisión', 4, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Negro'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Cadenas de ataque desde la espalda');

INSERT INTO techniques (discipline_belt_id, name, description, position, display_order, active)
SELECT db.id, 'Metodología de enseñanza', 'Transmitir y corregir técnica; rol de profesor / corner.', 'Enseñanza', 5, true
FROM discipline_belts db
JOIN discipline_age_categories ac ON ac.id = db.category_id
JOIN disciplines d ON d.id = ac.discipline_id
JOIN academies a ON a.id = d.academy_id
WHERE a.name = '__ACADEMY__' AND d.name = 'Jiu Jitsu' AND ac.name = 'Adultos' AND db.name = 'Negro'
  AND NOT EXISTS (SELECT 1 FROM techniques t WHERE t.discipline_belt_id = db.id AND t.name = 'Metodología de enseñanza');

