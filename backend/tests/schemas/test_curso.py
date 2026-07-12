import pytest

from app.schemas.curso import CursoIn, CursoOut


def test_curso_in_accepts_allowed_color():
    curso = CursoIn(
        semestre_id="s1", nombre="Cálculo II", codigo="MAT204", profesor="Ana", color="blue"
    )
    assert curso.color == "blue"


def test_curso_in_rejects_disallowed_color():
    with pytest.raises(ValueError):
        CursoIn(semestre_id="s1", nombre="A", codigo="A1", profesor=None, color="not-a-color")


def test_curso_out_from_attributes():
    class _Curso:
        id = "c1"
        semestre_id = "s1"
        nombre = "A"
        codigo = "A1"
        profesor = None
        color = "blue"

    out = CursoOut.model_validate(_Curso())
    assert out.id == "c1"
    assert out.color == "blue"
