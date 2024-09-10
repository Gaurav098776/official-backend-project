import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { kCryptography, kPGPDecrypt } from 'src/constants/strings';

@Injectable()
export class DBService {
  static encryptAttributes(attributes: string[]) {
    const finalizedAttributes = [];
    attributes.forEach((el) => {
      finalizedAttributes.push([
        Sequelize.fn(
          kPGPDecrypt,
          Sequelize.cast(Sequelize.col(el), 'bytea'),
          kCryptography,
        ),
        el,
      ]);
    });
    return finalizedAttributes;
  }

  pgEncrypt(data: any) {
    return Sequelize.fn('PGP_SYM_ENCRYPT', data, kCryptography);
  }

  pgDecrypt(attribute: string, level = 'Attribute') {
    if (level == 'Attribute')
      return [
        Sequelize.fn(
          'PGP_SYM_DECRYPT',
          Sequelize.cast(Sequelize.col(attribute), 'bytea'),
          kCryptography,
        ),
        attribute,
      ];
  }
}
