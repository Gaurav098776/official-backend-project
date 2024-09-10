import { Body, Controller, Get, Post, Query, Res, UseGuards } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { kInternalError, kSuccessData } from "src/constants/responses";
import { AdminAuthCheck } from "src/authentication/auth.guard";

@Controller('redis')
export class RedisController {
    constructor(private readonly redisService: RedisService) {}

    @Get('keyList')
    @UseGuards(AdminAuthCheck)
    async funKeyList(@Query() query, @Res() res){
        try {
            const data: any = await this.redisService.redisKeyLists(query);
            if (data?.message) return res.send(data);
            return res.send({ ...kSuccessData, data });
        } catch (error) {
            return res.send(kInternalError);
        }
    }

    @Get('keyValue')
    @UseGuards(AdminAuthCheck)
    async funKeyValue(@Query() query, @Res() res){
        try {
            const data: any = await this.redisService.redisKeyValue(query);
            if (data?.message) return res.send(data);
            return res.send({ ...kSuccessData, data });
        } catch (error) {
            return res.send(kInternalError);
        }
    }

    @Post('setKeyValue')
    @UseGuards(AdminAuthCheck)
    async funUpdateKeyValue(@Body() body, @Res() res){
        try {
            const data: any = await this.redisService.setRedisKeyValue(body);
            if(data?.message) return res.send(data);
            return res.send({ ...kSuccessData, data })
        } catch (error) {
            return res.send(kInternalError)
        }
    }

    @Post('deleteKey')
    @UseGuards(AdminAuthCheck)
    async funDeleteKey(@Body() body, @Res() res){
        try {
            const data: any = await this.redisService.redisKeyDelete(body)
            if(data?.message) return res.send(data);
            return res.send({ ...kSuccessData, data })
        } catch (error) {
            return res.send(kInternalError)
        }
    }
}