package org.pujun.heatmap;

import com.vividsolutions.jts.geom.Geometry;
import org.geotools.feature.FeatureCollection;
import org.geotools.feature.FeatureIterator;
import org.geotools.geojson.feature.FeatureJSON;
import org.json.JSONArray;
import org.json.JSONObject;
import org.opengis.feature.Feature;
import org.pujun.interp.InterpPm;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.text.ParseException;
import java.util.ArrayList;

/**
 * Created by milletpu on 16/3/31.
 */
public class HeatMap {
    String timePoint;
    private static final String CITY_PATH = "/Users/milletpu/airvis/src/main/webapp/maps/china_cities.json";

    public HeatMap(String timePoint) {
        this.timePoint = timePoint;
    }

    public void getInterpPm() throws IOException, ParseException {
        //获取全国所有城市的坐标
        InterpPm interpPm = new InterpPm(timePoint);
        FeatureJSON fj = new FeatureJSON();
        FeatureCollection fc = fj.readFeatureCollection(new FileInputStream(new File(CITY_PATH)));
        FeatureIterator iterator = fc.features();

        while (iterator.hasNext()) {
            Feature feature = iterator.next();
            String[] thisLocation = feature.getProperty("cp").getValue().toString().split(",");
            double thisLon = Double.parseDouble(thisLocation[0].replace("[", ""));
            double thisLat = Double.parseDouble(thisLocation[1].replace("]", ""));
            System.out.println("lat:"+ thisLat + "lon:" + thisLon);
            System.out.println(interpPm.pm10(thisLat, thisLon));
            System.out.println(interpPm.pm25(thisLat, thisLon));

        }


    }
}

class HeatMapTest{
    public static void main(String[] args) throws IOException, ParseException {
        HeatMap hmp = new HeatMap("2013-12-18 06:00:00");
        hmp.getInterpPm();

    }
}