import {
  CompareFacesCommand,
  RekognitionClient,
} from '@aws-sdk/client-rekognition';
import { Injectable } from '@nestjs/common';
import { kInternalError, kParamMissing } from 'src/constants/responses';
import { TypeService } from 'src/utils/type.service';
import { kFailedMatchForAWS } from 'src/constants/objects';

@Injectable()
export class AwsService {
  constructor(private readonly typeService: TypeService) {}

  async compareImages(data) {
    try {
      const imageA = data?.imageA;
      const imageB = data?.imageB;
      if (!imageA) return kParamMissing('imageA');
      if (!imageB) return kParamMissing('imageB');

      const imageABase64: any = await this.typeService.getBase64FromImgUrl(
        imageA,
      );
      const bytes1 = Buffer.from(imageABase64, 'base64');
      const imageBBase64: any = await this.typeService.getBase64FromImgUrl(
        imageB,
      );
      const bytes2 = Buffer.from(imageBBase64, 'base64');
      const params = {
        SourceImage: { Bytes: bytes1 },
        TargetImage: { Bytes: bytes2 },
        SimilarityThreshold: 50,
      };

      const rekognitionConfig = {
        region: 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AMAZON_ACCESS_KEY_ID,
          secretAccessKey: process.env.AMAZON_SECRET_ACCESS_KEY,
        },
      };
      let response: any = {};
      try {
        const client = await new RekognitionClient(rekognitionConfig);
        const command = new CompareFacesCommand(params);
        const result: any = await client.send(command);
        response = { ...(result ?? {}), imageA, imageB };
        const matchedList = result?.FaceMatches ?? [{ Similarity: 0.0 }];
        if (matchedList.length != 0) {
          const matchedResult = matchedList[0];
          if (matchedResult.length != 0 && matchedResult.Similarity >= 50.0)
            response.isMatched = true;
          else response.isMatched = false;
        } else response.isMatched = false;
      } catch (error) {
        return { ...kFailedMatchForAWS };
      }

      return response;
    } catch (error) {
      return kInternalError;
    }
  }
}
