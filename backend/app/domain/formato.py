"""Formato de números para los mensajes en español (coma decimal, punto de miles)."""


def num(valor, decimales: int = 1) -> str:
    if valor is None:
        return "—"
    texto = f"{float(valor):,.{decimales}f}"
    return texto.replace(",", "§").replace(".", ",").replace("§", ".")
