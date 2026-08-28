import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, cleanCpf } from '@/lib/auth'
import { createSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { cpf, password } = await req.json()
    if (!cpf || !password) {
      return NextResponse.json({ error: 'CPF e senha são obrigatórios' }, { status: 400 })
    }
    const cleanCpfValue = cleanCpf(cpf)
    if (cleanCpfValue.length !== 11) {
      return NextResponse.json({ error: 'CPF inválido' }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { cpf: cleanCpfValue } })
    if (!user) {
      return NextResponse.json({ error: 'CPF não cadastrado no sistema' }, { status: 401 })
    }
    if (!user.active) {
      return NextResponse.json({ error: 'Seu acesso está inativo. Contate o administrador.' }, { status: 403 })
    }
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
    }
    await createSession({ id: user.id, cpf: user.cpf, name: user.name, role: user.role })
    return NextResponse.json({
      ok: true,
      userId: user.id,
      name: user.name,
      role: user.role,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro interno: ' + err.message }, { status: 500 })
  }
}
