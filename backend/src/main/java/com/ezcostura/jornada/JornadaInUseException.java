package com.ezcostura.jornada;

import java.util.List;

public class JornadaInUseException extends RuntimeException {
    private final List<String> operarioNomes;

    public JornadaInUseException(List<String> operarioNomes) {
        super(message(operarioNomes));
        this.operarioNomes = List.copyOf(operarioNomes);
    }

    public List<String> getOperarioNomes() {
        return operarioNomes;
    }

    private static String message(List<String> nomes) {
        int n = nomes.size();
        String header = n == 1
            ? "Não é possível excluir: há 1 operário vinculado a esta jornada"
            : "Não é possível excluir: há " + n + " operários vinculados a esta jornada";
        int shown = Math.min(n, 5);
        String list = String.join(", ", nomes.subList(0, shown));
        if (n > shown) {
            list += " e mais " + (n - shown);
        }
        return header + " (" + list + ").";
    }
}
