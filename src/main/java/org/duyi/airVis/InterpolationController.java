package org.duyi.airVis;

import org.json.*;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Random;

/**
 * Created by yidu on 3/22/16.
 */
@Controller
public class InterpolationController {

    /**
     *
     * @param latitudes 纬度
     * @param longitudes 经度
     * @return 根据输入的经纬度,返回差值后的数据
     * http://localhost:8081/rbfScalar.do?latitudes=1&latitudes=1&longitudes=2&longitudes=3
     */
    @RequestMapping(value = "rbfScalar.do", method = RequestMethod.POST)
    public
    @ResponseBody
    String getRBFScalar(Double[] latitudes, Double[] longitudes) {
        if(latitudes == null || longitudes == null || latitudes.length != longitudes.length){
            return "error";
        }
        JSONArray result = new JSONArray();

        for(int i = 0; i < latitudes.length; i ++){
//            System.out.println(latitudes[i]+":"+longitudes[i]+"; ");
            result.put(new Double(new Random().nextDouble() * 100));
        }
        return result.toString();
    }
}
