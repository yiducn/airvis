package org.pujun.heatmap;

import com.vividsolutions.jts.geom.Geometry;
import org.geotools.feature.FeatureCollection;
import org.geotools.feature.FeatureIterator;
import org.geotools.geojson.feature.FeatureJSON;
import org.json.JSONArray;
import org.json.JSONObject;
import org.opengis.feature.Feature;
import org.pujun.interp.InterpPm;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.Ellipse2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.text.ParseException;
import java.util.ArrayList;

import static java.lang.Math.abs;
import static java.lang.Math.ceil;

/**
 * Created by milletpu on 16/3/31.
 */
public class HeatMap {
    private String timePoint;
    private Color maxColor = new Color(255,0,0,100);
    private Color minColor = new Color(127,255,0,100);
    private double minValue,maxValue;
    private static final String CITY_PATH = "/Users/milletpu/airvis/src/main/webapp/maps/china_cities.json";

    public HeatMap(String timePoint) {
        this.timePoint = timePoint;
    }

    public void drawPm25(double maxValue,double minValue) throws ParseException, IOException {
        this.maxValue = maxValue;
        this.minValue = minValue;
        InterpPm interpPm = new InterpPm(timePoint);

        DrawHeatMap dg = new DrawHeatMap();     //实例化 画heatmap
        dg.init();      //初始化读入地图背景，png
        for (int i = 0; i < interpPm.pm25s.length; i++) {
            dg.outpng="/Users/milletpu/airvis/src/main/java/org/pujun/heatmap/outimageorigin.png";
            dg.graphics.setColor(useColor(interpPm.pm25s[i]));
            dg.drawEllipse(interpPm.pm25Points[i][0], interpPm.pm25Points[i][1]);
        }

    }

    public void drawInterpPm25(double maxValue, double minValue) throws IOException, ParseException {
        this.minValue = minValue;
        this.maxValue = maxValue;
        //获取全国所有城市的坐标
        InterpPm interpPm = new InterpPm(timePoint);
        FeatureJSON fj = new FeatureJSON();
        FeatureCollection fc = fj.readFeatureCollection(new FileInputStream(new File(CITY_PATH)));
        FeatureIterator iterator = fc.features();

        DrawHeatMap dg = new DrawHeatMap();     //实例化 画heatmap
        dg.init();      //初始化读入地图背景，png

        while (iterator.hasNext()) {
            Feature feature = iterator.next();
            String[] thisLocation = feature.getProperty("cp").getValue().toString().split(",");
            double thisLon = Double.parseDouble(thisLocation[0].replace("[", ""));
            double thisLat = Double.parseDouble(thisLocation[1].replace("]", ""));
            double thisPm25 = interpPm.pm25(thisLat, thisLon);
            //System.out.println(thisPm25);
            dg.graphics.setColor(useColor(thisPm25));
            dg.drawEllipse(thisLat, thisLon);//取出全国所有城市的坐标，在地图png上画点


//            System.out.println("lat:"+ thisLat + "lon:" + thisLon);
//            System.out.println(interpPm.pm10(thisLat, thisLon));
//            System.out.println(interpPm.pm25(thisLat, thisLon));
        }
    }

    public Color useColor(double value){
        Color thisColor;
        int selectCorlor = (int) ceil((value - minValue) / (maxValue - minValue) * 383);    //383种渐变颜色
        if (selectCorlor >= maxValue) {
            return maxColor;
        }else if(selectCorlor >= 0 && selectCorlor <= 127){
            thisColor = new Color(minColor.getRed()+selectCorlor,255,0,50);
            return thisColor;
        }else if(selectCorlor >=128 && selectCorlor <= 383){
            thisColor = new Color(255,minColor.getGreen()-(selectCorlor-128),0,50);
            return thisColor;
        }else{
            return minColor;
        }
    }

    public static void main(String[] args) throws IOException, ParseException {
        HeatMap heatMap = new HeatMap("2013-12-18 06:00:00");
        heatMap.drawInterpPm25(200, 0);
        //heatMap.drawPm25(200,0);

    }
}
