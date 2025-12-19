import { fork } from '../../shared/db/orm.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { LoginDTO, RefreshTokenDTO } from './auth.schema.js';
import { HashUtil } from '../../shared/utils/hash.js';
import { JwtUtil } from '../../shared/auth/jwt.js';
import { AppError } from '../../shared/errors/AppError.js';


export class AuthController {
  async login(data: LoginDTO) {
    const em = fork();

    // Buscar usuario por username
    const usuario = await em.findOne(Usuario, { username: data.username });

    if (!usuario) {
      throw AppError.unauthorized('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await HashUtil.compare(data.password, usuario.passwordHash);

    if (!isPasswordValid) {
      throw AppError.unauthorized('Credenciales inválidas');
    }

    // Generar tokens
    const payload = {
      sub: usuario.id,
      username: usuario.username,
      sector: usuario.sector,
    };

    const accessToken = JwtUtil.generateAccessToken(payload);
    const refreshToken = JwtUtil.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        sector: usuario.sector,
      },
    };
  }

  async refresh(data: RefreshTokenDTO) {
    // Verificar y decodificar el refresh token
    const payload = JwtUtil.verifyRefreshToken(data.refreshToken);

    const em = fork();

    // Verificar que el usuario aún existe
    const usuario = await em.findOne(Usuario, { id: payload.sub });

    if (!usuario) {
      throw AppError.unauthorized('Usuario no encontrado');
    }

    // Generar nuevo access token
    const newPayload = {
      sub: usuario.id,
      username: usuario.username,
      sector: usuario.sector,
    };

    const accessToken = JwtUtil.generateAccessToken(newPayload);

    return {
      accessToken,
      user: {
        id: usuario.id,
        username: usuario.username,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        sector: usuario.sector,
      },
    };
  }

  async me(userId: number) {
    
    const em = fork();

    const usuario = await em.findOne(Usuario, { id: userId });

    if (!usuario) {
      throw AppError.notFound('Usuario no encontrado');
    }

    return {
      id: usuario.id,
      username: usuario.username,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      sector: usuario.sector,
    };
  }
    
}
