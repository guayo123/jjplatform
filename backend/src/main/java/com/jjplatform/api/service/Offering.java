package com.jjplatform.api.service;

import com.jjplatform.api.model.ClassSchedule;
import com.jjplatform.api.model.Discipline;
import com.jjplatform.api.model.Plan;

/**
 * Qué se ofrece hoy: desactivar una disciplina la oculta junto con todo lo que cuelga de ella
 * (sus planes y las clases de esos planes), sin tener que desactivarlos uno a uno. Reactivarla lo devuelve
 * todo, porque nada se borra: la visibilidad se calcula al leer.
 */
public final class Offering {

    private Offering() {}

    /** Una disciplina inexistente (plan sin disciplina) no oculta nada. */
    public static boolean disciplineOn(Discipline d) {
        return d == null || !Boolean.FALSE.equals(d.getActive());
    }

    public static boolean planOn(Plan p) {
        return Boolean.TRUE.equals(p.getActive()) && disciplineOn(p.getDiscipline());
    }

    /** Clase vigente: no dada de baja y, si pertenece a un plan, con la disciplina del plan activa. */
    public static boolean scheduleOn(ClassSchedule s) {
        return !Boolean.FALSE.equals(s.getActive())
                && (s.getPlan() == null || disciplineOn(s.getPlan().getDiscipline()));
    }
}
