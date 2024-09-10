// Imports
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import {
  kInternalError,
  kParamMissing,
  kSuccessData,
} from 'src/constants/responses';
import { ServiceService } from './service.service';

@Controller('admin/service')
export class ServiceController {
  constructor(private readonly service: ServiceService) {}

  // Add service -> PAN
  @Post('addService')
  async funAddService(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.addService(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  // Add service provider -> ZOOP for PAN
  @Post('addProviders')
  async funAddProviders(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.addServiceProviders(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('activeList')
  async funActiveList(@Query() query, @Res() res) {
    try {
      const data: any = await this.service.getServiceList(query);
      if (data?.message) return res.send(data);
      return res.send({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.send(kInternalError);
        }
  }

  @Get('getActiveService')
  async getActiveService(@Query() query, @Res() res) {
    try {
      if (!query.serviceType) return res.json(kParamMissing('serviceType'));
      const data: any = await this.service.getMultipleActiveService(query);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Post('updateService')
  async funUpdateService(@Body() body, @Res() res) {
    try {
      const data: any = await this.service.updateService(body);
      if (data.message) return res.json(data);
      return res.json({ ...kSuccessData, data });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }

  @Get('interviewtask/flutter')
  async getFlutterInterviewTask(@Query() query, @Res() res) {
    try {
      return res.json({
        status: 'ok',
        statusCode: 200,
        data: {
          title: 'Hello App',
          theme: {
            primaryColor: '#B2A4FF',
            accentColor: '#FFB4B4',
          },
          screens: [
            {
              screenName: 'usersScreen',
              type: 'user',
              title: 'Registered Users',
              url: 'https://jsonplaceholder.typicode.com/users/',
              theme: {
                primaryColor: '#57C5B6',
                accentColor: '#159895',
              },
              nextScreen: 'postsScreen',
            },
            {
              screenName: 'todosScreen',
              type: 'todo',
              title: 'Active Todos',
              url: 'https://jsonplaceholder.typicode.com/todos/',
              theme: {
                primaryColor: '#A84448',
                accentColor: '#E9A178',
              },
              nextScreen: 'usersScreen',
            },
            {
              screenName: 'postsScreen',
              type: 'post',
              title: 'All Posts',
              url: 'https://jsonplaceholder.typicode.com/posts/',
              theme: {
                primaryColor: '#4D455D',
                accentColor: '#E96479',
              },
              nextScreen: 'todosScreen',
            },
          ],
        },
      });
    } catch (error) {
            console.error("Error in: ", error);
            return res.json(kInternalError);
        }
  }
}
